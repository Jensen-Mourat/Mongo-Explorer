let tryCatch = async (fn, options) => {
    try {
        const v = await fn();
        if (options && options.falsyError && !v) {
            return [undefined, options.falsyError]
        }
        return [v];
    } catch (e) {
        return [undefined, e]
    }
}

module.exports.tryCatch = tryCatch;
