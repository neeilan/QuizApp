var _ = require('lodash'),
    async = require('async'),
    mongoose = require('mongoose');

var models = require('.');

var QuizSchema = new mongoose.Schema({
    name: { type: String, required: true },
    // note: questions are sorted in the order that they are arranged 
    // i.e. [0] => 1st question, [1] => 2nd question, etc
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    shuffleChoices: Boolean,
    useLaTeX: Boolean,
    points: { type: Number, default : 4 },
    firstTryBonus: { type : Number, default : 1 },
    penalty: { type : Number, default : 1 }
}, { 
    timestamps: true
});
// Delete cascade
QuizSchema.pre('remove', function (next) {
    var quiz = this;
    async.parallel([
        function deleteFromCourse(done) {
            models.Course.update({ quizzes: { $in: [quiz._id] }}, { $pull: { quizzes: quiz._id }}).exec(done);
        },
        function deleteQuestions(done) {
            models.Question.remove({ _id: { $in: quiz.questions }}).exec(done);
        },
        function deleteTutorialQuiz(done) {
            models.TutorialQuiz.remove({ quiz: quiz._id }).exec(done);
        }
    ], next);
});
// populate questions
QuizSchema.methods.withQuestions = function () {
    return this.populate('questions');
};
// Load quiz' tutorials
QuizSchema.methods.loadTutorials = function () {
    var quiz = this;
    return models.TutorialQuiz.find({ quiz: quiz }).populate('tutorial').exec(function (err, tutorialQuizzes) {
        quiz.tutorials = tutorialQuizzes.map(function (tutorialQuiz) { 
            return tutorialQuiz.tutorial.id;
        });
    });
};
// Save quiz
QuizSchema.methods.store = function (obj, callback) {
    this.name = obj.name;
    this.gradingScheme = obj.gradingScheme;
    this.shuffleChoices = !!obj.shuffleChoices;
    this.useLaTeX = !!obj.useLaTeX;
    this.points = obj.points;
    this.firstTryBonus = obj.firstTryBonus;
    this.penalty = obj.penalty;

    var quiz = this;

    async.series([
        // save quiz
        function (done) {
            quiz.save(done);
        },
        // get quiz' tutorials
        function (done) {
            quiz.loadTutorials().then(function () { done(); });
        },
        // delete old tutorials
        function (done) {
            async.eachSeries(_.difference(quiz.tutorials, obj.tutorials), function (tutorial, done) {
                models.TutorialQuiz.findOneAndRemove({ tutorial: tutorial, quiz: quiz }, done);
            }, done);
        },
        // insert new tutorials
        function (done) {
            async.eachSeries(_.difference(obj.tutorials, quiz.tutorials), function (tutorial, done) {
                models.TutorialQuiz.create({ tutorial: tutorial, quiz: quiz }, done);
            }, done);
        }
    ], function (err) {
        callback(null, quiz);
    });
};

module.exports = mongoose.model('Quiz', QuizSchema);