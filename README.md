# Mongo-Explorer
Not sure if your new code wrote data correctly in your Mongo database, and you are tired of using MongoDB compass (or writing queries) to check if your data as well as the references are set correctly?
<br><br>Mongo-Explorer is here to help. 
<br><br>Just configure it and checking your database will be blazing fast! The best is that Mongo-Explorer populates the references automatically! 
<br>No more copy and pasting a reference in a new query\compass to check if it's the correct reference.

## Installation

```npm i -g mongo_explorer```

## Commands

    -h: help
    -c: delete the config file containing the default values
    -a: always use all default values, you will need to use -c to set new values
    -d: usage: -d=x where x will be the default depth to populate the result
    -p: usage -p=<PATH> where <PATH> points to the folder the result file will be written
    --arrayLength: usage: --arrayLength=x where x will be the length of any array resolved, default = full length of the array
    --arrayDepth: usage: --arrayDepth=x where x will be the depth at which an object in an array will be resolved, default = 1
    --noConsole: does not print the results on the console, but writes it at the default or specified path
    --setPath: set and save a default path for the result log
    --useDefaultPath: deletes any path which was set previously and uses the default path
    --allCollections: searches in all collection
    --collection: a collection to search in
    --id: the ObjectId to search for

## Example Usage

``` mongo-explorer -a -d=1 --id=60c343babb35c357f42e7cb6 --allCollections```

## Getting Started
You will need a mongo database instance running! 

First run mongo-explorer in cmd
    
```mongo-explorer```

If you need to view the command list run

```mongo-explorer -h```

If it's your first time running mongo-explorer, or you never set any defaults
you will be prompted to enter your database uri and database name:

```
   Mongo-Explorer running, use -h for the list of commands.
   Your database uri: (as mongodb://<user>:<password>@127.0.0.1:27017/<db> »
   enter a database name:
```
 You will be prompted to save the details as default, if you choose to same the you will be asked to use the default values everytime you run mongo-explorer.
 You can also use `-a` to use default values automatically.

Then you will be asked to choose your collection. Choose `* all collections *` will search in every collection. 
Useful when you do not know in which collection your object is. Adding the command `--allCollections` will do that automatically.

Then you will be prompted to input the ObjectId, and the at which depth mongo-explorer should stop populating references (lower the depth, faster the result)

Since arrays are requires a lot of processing to resolve, its depth of resolution is set to 1 by default.
This can be changed using `--arrayDepth` command. The `--arrayLength` command when specified will just truncate any array to the length specified, again to reduce processing.
    
