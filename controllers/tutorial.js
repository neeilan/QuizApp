var _ = require('lodash'),
    async = require('async'),
    config = require('../lib/config'),
    models = require('../models');
// Retrieve tutorial
exports.getTutorialByParam = function (req, res, next, tutorial) {
    models.Tutorial.findById(tutorial, function (err, tutorial) {
        if (err)
            return next(err);
        if (!tutorial)
            return next(new Error('No tutorial is found.'));
        req.tutorial = tutorial;
        next();
    });
};
// Retrieve list of tutorials for course
exports.getTutorials = (req, res) => {
    req.course.withTutorials(true).execPopulate().then(function (err) {
        res.render('admin/course-tutorials', {
            title: 'Tutorials',
            course: req.course 
        });
    });
};
// Add multiple tutorials for course
exports.addTutorials = (req, res) => {
    var len = Math.abs(_.toInteger(req.body.len)),
        start = Math.abs(_.toInteger(req.body.start)),
        range = _.range(start, len + start);
    req.course.withTutorials().execPopulate().then(function () {
        // get list of tutorial numbers
        var numbers = _.map(req.course.tutorials, function (tutorial) {
            return tutorial.number;
        });
        // add new tutorials
        async.eachSeries(range, function (n, done) {
            // check whether number has not already been processed
            if (numbers.indexOf(n) !== -1)
                return done();
            // check whether tutorial has already been
            models.Tutorial.create({ number: n }, function (err, tutorial) {
                if (err)
                    return done(err);
                req.course.update({ $addToSet: { tutorials: tutorial.id }}, done);
            });
        }, function (err) {
            if (err)
                req.flash('error', 'An error has occurred while trying to perform operation.');
            else
                req.flash('success', 's of tutorials have been updated.');
            res.redirect('/admin/courses/' + req.course.id + '/tutorials');
        });
    });
};
// Retrieve specific tutorial for tutorial
exports.getTutorial = (req, res) => {
    res.render('admin/course-tutorial', {
        title: 'Edit tutorial',
        course: req.course, 
        tutorial: req.tutorial 
    });
};
// Update specific tutorial for course
exports.editTutorial = (req, res) => {
    req.tutorial.set(req.body).save(function (err) {
        if (err)
            req.flash('error', 'An error has occurred while trying to perform operation.');
        else
            req.flash('success', 'Tutorial <b>%s</b> has been updated.', req.tutorial.number);
        res.redirect('/admin/courses/' + req.course.id + '/tutorials/' + req.tutorial.id + '/edit');
    });
};
// Delete specific tutorial for course
exports.deleteTutorial = (req, res) => {
    req.tutorial.remove(function (err) {
        if (err)
            req.flash('error', 'An error has occurred while trying to perform operation.');
        else
            req.flash('success', 'Tutorial <b>%s</b> has been deleted.', req.tutorial.number);
        res.sendStatus(200);
    });
};