const {Input, Select} = require('enquirer');


let _inputPrompt = (message, initial) => {
    const prompt = new Input({
        message,
        initial,
    });
    return prompt.run();
}

const inputPrompt = async (m, i) => {
    try {
        return await _inputPrompt(m, i);
    } catch (e) {
        process.exit()
    }
}

let _selectPrompt = (message, choices, initial) => {
    const prompt = new Select({
        message,
        choices,
        initial
    });
    return prompt.run();
}

const selectPrompt = async (m, c, i) => {
    try {
        return await _selectPrompt(m, c, i);
    } catch (e) {
        process.exit()
    }
}

module.exports = {inputPrompt, selectPrompt}
