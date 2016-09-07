var mongoose = require('mongoose'),
    _ = require('lodash');

var QuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    type: { type: String, enum: ['multiple choice', 'true or false', 'multiple select'/*, 'fill in the blanks'*/] },
    choices: [String],
    answers: [Number],
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }]
}, { 
    timestamps: true 
});

QuestionSchema.methods.loadAndSave = function (data, callback) {
    this.question = data.question;
    this.type = data.type;
    this.files = data.files;
    this.choices = []; // clear previous choices
    this.answers = []; // clear previous answers
    this.useLaTeX = data.useLaTeX;

    var selected, key, matches, value, d;

    switch (this.type) {
        case 'multiple choice':
        case 'true or false':
        //case 'fill in the blanks':
            selected = data.answer[_.kebabCase(this.type)];
            // add choices + answer
            for (d in data.choices) {
                value = _.trim(data.choices[d]);
                if (value) {
                    this.choices.push(value);
                    if (d === selected) {
                        this.answers = [this.choices.length - 1];
                    }
                }
            }
            break;
        case 'multiple select':
            selected = data.answers[_.kebabCase(this.type)] || [];
            // add choices + answers
            for (d in data.choices) {
                value = _.trim(data.choices[d]);
                if (value) {
                    this.choices.push(value);
                    if (selected.indexOf(d) !== -1) {
                        this.answers.push(this.choices.length - 1);
                    }
                }
            }
            break;
        default:
            break;
    }

    this.save(callback);
};

module.exports = mongoose.model('Question', QuestionSchema);