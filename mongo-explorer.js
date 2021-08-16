const {tryCatch} = require("./tryCatch.js");
const {inputPrompt, selectPrompt} = require("./prompt.js");
const {MongoClient} = require('mongodb');
const fs = require('fs')
const path = require('path');
const {ObjectId} = require('mongodb');
const ALL_COLLECTION = '* all collections *';
let db = '';
let collection;
let uri = '';
let useDefaults;
let searchAllCollections;
let defaultDepth;
const args = require('minimist')(process.argv.slice(2), {'_': false, 'boolean': true});
const logFileName = path.sep + 'mongo-explorer-results.json';
const configPath = __dirname + path.sep + 'config.json';
let noConsole;
let defaultLogPath = __dirname + logFileName;
let temporaryPath;
let arrayLength;
let arrayDepth = 1;
let defaultCollection;
let defaultId;
const possibleArgs = [
    'h',
    'c',
    'a',
    'd',
    'p',
    'arrayLength',
    'arrayDepth',
    'noConsole',
    'setPath',
    'useDefaultPath',
    'allCollections',
    'collection',
    'id']

const checkIncompatibleArgs = (args, incompatibleList) => {
    incompatibleList.forEach(incompatibles => {
            const length = incompatibles.length;
            let argsPresent = 0;
            if (length > 1) {
                incompatibles.forEach(i => {
                    const arg = args[i]
                    if (arg) {
                        argsPresent++;
                    }
                    if (argsPresent > 1) {
                        throw new Error('incompatible arguments: ' + incompatibles.map(s => `"${s}"`).join(', '))
                    }
                })
            }
        }
    )
}

const checkUniqueArgs = (args, unique) => {
    const length = args.length;
    unique.forEach(u => {
        if (args[u]) {
            if (length > 1) {
                throw new Error(`Command: ${u} cannot be used with any other command`)
            }
        }
    })
}

const checkNumber = (val, param) => {
    if (typeof val !== "number") {
        throw new Error(`invalid parameter, ${param} can only take a number`)
    }
    return true
}
const checkPossibleArgs = (args) => {
    Object.keys(args).forEach(a => {
            if (!possibleArgs.includes(a)) {
                throw new Error(`Invalid command: "${a}", please check the spelling`)
            }
        }
    )
}
const checkArgs = async () => {
    delete args._
    checkPossibleArgs(args);
    checkIncompatibleArgs(args, [
        ['a', 'c'],
        ['c', 'allCollections'],
        ['useDefaultPath', 'p'],
        ['allCollections', 'collection']
    ])
    checkUniqueArgs(args, ['setPath', 'h'])
    if (args.h) {
        console.log('Commands: ')
        console.log('')
        console.log('-h : help');
        console.log('-c: delete the config file');
        console.log('-a: always use all default values, you will need to use -c to set new values')
        console.log('-d: usage: -d=x where x will be the default depth for search')
        console.log('-p: usage -p=<PATH> where <PATH> points to the folder the result file will be written')
        console.log('--arrayLength: usage: --arrayLength=x where x will be the length of array resolved, default = full length of the array')
        console.log('--arrayDepth: usage: --arrayDepth=x where x will be the depth at which an object in an array will be resolved, default: 1')
        console.log('--noConsole: does not print the results on the console, but writes it at')
        console.log('--setPath: set and save a default logs path')
        console.log('--useDefaultPath: deletes any path set previously and uses default path ' + defaultLogPath)
        console.log('--allCollections: searches all collection');
        console.log('--collection: a collection to search in');
        console.log('--id: the ObjectId to search for')
        return
    }
    if (args.collection) {
        defaultCollection = args.collection;
    }
    if (args.id) {
        defaultId = args.id;
    }
    if (args.noConsole) {
        noConsole = true;
    }
    if (args.setPath) {
        const p = args.setPath;
        [f, noFile] = await tryCatch(() => fs.readFileSync(configPath));
        fs.writeFileSync(configPath, JSON.stringify(f ? {
            ...JSON.parse(f),
            path: p + logFileName
        } : {path: p + logFileName}))
        return
    }
    if (args.useDefaultPath) {
        [f, noFile] = await tryCatch(() => fs.readFileSync(configPath));
        fs.writeFileSync(configPath, JSON.stringify(f ? {
            ...JSON.parse(f),
            path: defaultLogPath
        } : {path: defaultLogPath}))
    }
    if (args.p) {
        defaultLogPath = args.p + logFileName;
        temporaryPath = true;
    }
    if (args.d) {
        const d = args.d
        if (checkNumber(d, '-d')) {
            defaultDepth = d > 0 ? d : 0;
        }
    }
    if (args.arrayLength) {
        const al = args.arrayLength
        if (checkNumber(al, '--arrayLength')) {
            arrayLength = al > 0 ? al : 0;
        }
    }
    if (args.arrayDepth) {
        const ad = args.arrayDepth
        if (checkNumber(ad, '--arrayDepth')) {
            arrayDepth = ad > 0 ? ad : 0;
        }
    }
    if (args.allCollections) {
        searchAllCollections = true;
    }
    if (args.c) {
        try {
            fs.unlinkSync(configPath);
            console.log('config file cleared!');
        } catch (e) {
            console.log('no config file!')
        }
    }
    if (args.a) {
        [f, noFile] = await tryCatch(() => fs.readFileSync(configPath));
        if (f) {
            const file = checkFile(f);
            if (file.uri) {
                if (file.db) {
                    useDefaults = true;
                } else {
                    console.error('No default database, could not use automatic defaults')
                }
            } else {
                console.error('No default uri, could not use automatic defaults')
            }
        } else {
            console.error('No default values set, could not use automatic defaults');
        }
    }
    await main();
}


async function main() {
    console.log('Mongo-Explorer running, use -h for the list of commands.')
    uri = '';
    let client;
    [f, noFile] = await tryCatch(() => fs.readFileSync(configPath));
    let _db;
    let file;
    if (f) {
        file = checkFile(f)
    }
    if (file && file.path && !temporaryPath) {
        defaultLogPath = file.path;
    }
    let clientErr;
    if (file && file.uri) {
        const _uri = file.uri;
        const _uriString = _uri.split('@');
        const uriString = _uriString[0].split('//')[0] + '//' + '*********' + '@' + _uriString[1];
        _db = file.db;
        if (!useDefaults) {
            const a1 = await selectPrompt(`Use default uri: ${uriString}?`, ['yes', 'no']);
            if (a1 === 'yes') {
                uri = _uri;
                [client, clientErr] = await tryCatch(() => connectClient(uri))
            } else {
                [client, clientErr] = await tryCatch(() => saveUri());
            }
        } else {
            uri = _uri;
            [client, clientErr] = await tryCatch(() => connectClient(uri))
        }
    } else {
        [client, clientErr] = await tryCatch(() => saveUri());
    }
    if (clientErr) {
        await main();
        return;
    }
    await checkDb(_db, client)
}

const checkFile = (f) => {
    try {
        return JSON.parse(f);
    } catch (e) {
        try {
            fs.unlinkSync(configPath);
        } catch (e) {

        }
        throw new Error('Invalid config file, the current saved config will be deleted, please try the command again to create a new config')
    }
}

const checkDb = async (_db, client) => {
    let dbErr;
    db = '';
    let collections;
    if (_db) {
        if (!useDefaults) {
            const a3 = await selectPrompt(`Use default db: ${_db}?`, ['yes', 'no'])
            if (a3 === 'yes') {
                db = _db;
                collections = await collectionsPresent(_db, client)
            } else {
                [collections, dbErr] = await tryCatch(() => saveDb(client));
            }
        } else {
            db = _db;
            collections = await collectionsPresent(_db, client)
        }
    } else {
        [collections, dbErr] = await tryCatch(() => saveDb(client));
    }
    if (!dbErr && collections && collections.length > 0) {
        await checkCollections(collections, client);
    } else {
        console.error('This db has no collection, please use another db')
        await deleteProperty(['db'])
        await checkDb('', client)
    }
}

const checkCollections = async (collections, client) => {
    const find = async (_collection, _id) => {
        return await tryCatch(() => client.db(db).collection(_collection).findOne({_id: new ObjectId(_id)}), {falsyError: `Did not find id in collection ${_collection}`})
    }
    const findInAllCollections = async (_id) => {
        let result;
        let resCollection;
        for (let col of collections) {
            const [obj, e2] = await find(col, _id);
            if (!e2) {
                result = obj;
                resCollection = col;
                break;
            }
        }
        if (!result) {
            return [undefined, new Error('Id does not exist in any collections'), undefined]
        }
        return [result, undefined, resCollection];
    }
    if (defaultCollection) {
        collection = defaultCollection;
    } else {
        collection = searchAllCollections ? undefined : await selectPrompt('choose collection:', [ALL_COLLECTION, ...collections])
    }
    console.log({collections, searchAllCollections, collection})

    if (!searchAllCollections && !collections.includes(collection)) {
        throw new Error('invalid collection')
    }
    if (collection === ALL_COLLECTION) {
        searchAllCollections = true;
    }
    const id = defaultId ?? await inputPrompt('enter ObjectId:', '');
    const depth = typeof defaultDepth !== "undefined" ? defaultDepth : await inputPrompt('enter population depth:', 0);
    const [obj, e2, resCol] = searchAllCollections ? await findInAllCollections(id) : await find(collection, id);
    if (e2) {
        if (!defaultId && !searchAllCollections && !defaultCollection) {
            console.error(e2);
            await checkCollections(collections, client)
        } else {
            throw new Error(e2)
        }
    } else {
        const getObj = async (object, _depth) => {
            for (let _col of collections) {
                const [o] = await find(_col, object.toString())
                if (o) {
                    return await populate(o, _depth - 1)
                }
            }
            return {}
        }
        const populate = async (obj, _depth) => {
            if (_depth <= 0) {
                const id = obj._id;
                // remove long arrays
                if (arrayLength !== undefined) {
                    for (let k of Object.keys(obj)) {
                        if (obj[k] instanceof Array) {
                            obj[k] = obj[k].slice(0, arrayLength)
                        }
                    }
                }
                return {id, ...obj};
            }
            for (let k of Object.keys(obj)) {
                if (k !== '_id') {
                    if (obj[k] instanceof Array) {
                        const temp = [];
                        const slicedArr = arrayLength === undefined ? obj[k] : obj[k].slice(0, arrayLength)
                        for (let s of slicedArr) {
                            if (s instanceof ObjectId) {
                                const _arrObj = await getObj(s, arrayDepth);
                                temp.push(_arrObj)
                            }
                        }
                        obj[k] = temp;
                    }
                    if (obj[k] instanceof ObjectId) {
                        obj[k] = await getObj(obj[k], _depth)
                    }
                }
            }
            return obj;
        }
        const result = await populate(obj, parseInt(depth, 10))
        const json = JSON.stringify(searchAllCollections ? {presentInCollection: resCol, ...result} : result, (key, val) => {
            if (key && key.includes('_')) {
                return undefined;
            }
            return val;
        }, 2)
        if (!noConsole) {
            console.log(json);
        }
        try {
            fs.writeFileSync(defaultLogPath, json)
            console.log('Result written at ' + defaultLogPath)
        } catch (e) {
            console.error('Failed to write to ' + defaultLogPath)
        }
        if (!defaultId && !searchAllCollections && !defaultCollection) {
            await checkCollections(collections, client)
        } else {
            exit()
        }
    }
}

const saveDb = async (client) => {
    db = await inputPrompt(`enter a database name:`, db);
    const collections = await collectionsPresent(db, client);
    if (db && collections && collections.length > 0) {
        const a2 = await selectPrompt(`save this db as default?`, ['yes', 'no']);
        if (a2 === 'yes') {
            [f, noFile] = await tryCatch(() => fs.readFileSync(configPath));
            fs.writeFileSync(configPath, JSON.stringify(f ? {...JSON.parse(f), db} : {db}))
        }
        return collections;
    } else {
        throw Error();
    }
}

const collectionsPresent = async (db, client) => {
    const _collections = await client.db(db).listCollections().toArray();
    return _collections.map(x => x.name)
}


const saveUri = async () => {
    uri = await inputPrompt(`Your database uri: (as mongodb://<user>:<password>@127.0.0.1:27017/<db>`, uri);
    const [client, err] = await tryCatch(() => connectClient(uri));
    if (err) {
        throw err;
    }
    const a2 = await selectPrompt(`save this uri as default?`, ['yes', 'no']);
    if (a2 === 'yes') {
        [f, noFile] = await tryCatch(() => fs.readFileSync(configPath));
        fs.writeFileSync(configPath, JSON.stringify(f ? {...JSON.parse(f), uri} : {uri}))
    }
    return client;
}

const connectClient = async (uri) => {
    const client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});
    const [_, e] = await tryCatch(() => client.connect());
    if (e) {
        await deleteProperty(['uri'])
        console.error('Invalid Uri, please enter a valid uri: (as mongodb://<user>:<password>@127.0.0.1:27017/<db>')
        throw new Error()
    } else {
        return client;
    }
}

const deleteProperty = async (props) => {
    [f, noFile] = await tryCatch(() => fs.readFileSync(configPath));
    if (f) {
        const file = JSON.parse(f);
        props.forEach(p => {
            try {
                delete file[p];
            } catch (e) {

            }
        })
        if (Object.keys(file).length > 0) {
            fs.writeFileSync(configPath, JSON.stringify(file))
        }
    }
}

const exit = () => {
    process.exit();
}

const mongoExplorer = () => {
    checkArgs().catch(e => {
        console.error(e);
        exit()
    });
}

module.exports = mongoExplorer;



