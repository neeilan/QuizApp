var fs = require('fs');

var _ = require('lodash'),
    async = require('async');

var models = require('../models');

// Retrieve file
exports.getFile = function (req, res, next, fil3) {
    models.File.findById(fil3, function (err, fil3) {
        if (err) {
            return next(err);
        }
        if (!fil3) {
            return next(new Error('No file is found.'));
        }
        console.log('got fil3');
        req.fil3 = fil3; // careful: req.file is used by multer
        next();
    });
};
// Retrieve all files in the course
exports.getFileList = function (req, res) {
    req.course.withFiles().execPopulate().then(function (err) {
        /*if (err) {
            return res.status(500).send("Unable to retrieve any files at this time (" + err.message + ").");
        }*/
        res.render('admin/course-files', { course: req.course });
    });
};
// Retrieve specific file
exports.getFileForm = function (req, res) {
    if (!req.fil3) {
        req.fil3 = new models.File();
    }
    res.render('admin/course-file', {
        title: req.fil3.isNew ? 'Add new file' : 'Edit file',
        course: req.course, 
        fil3: req.fil3
    });
};
// Add new files
exports.addFiles = function (req, res) {
    async.eachSeries(req.files, function (obj, done) {
        var fil3 = new models.File();
        fil3.store(obj, function (err) {
            req.course.files.push(fil3);
            req.course.save(done); 
        });
    }, function (err) {
        if (err) {
            req.flash('failure', 'Unable to save files at this time.');
        } else {
            req.flash('success', 'The files have been saved successfully.');
        }
        res.json({ status: true });
    });
};
// Update specific file for course
exports.editFile = function (req, res) {
    req.fil3.store(req, function (err) {
        if (err) {
            req.flash('failure', 'Unable to update file at this time.');
        } else {
            req.flash('success', 'The file has been updated successfully.');
        }
        res.redirect('/admin/courses/' + req.course.id + '/files/' + req.fil3.id + '/edit');
    });
};
// Delete specific file for course
exports.deleteFiles = function (req, res, next) {
    async.eachSeries(req.body.files, function (id, done) {
        // remove file from collection
        models.File.findByIdAndRemove(id, function (err, fil3) {
            if (err) {
                return next(err);
            }
            var path = __dirname + '/../public/upl/' + req.course.id + '/' + fil3.name;
            // remove file from filesystem
            fs.stat(path, function (err, stats) {
                if (err && err.code === 'ENOENT') {
                    return done();
                } else if (err) {
                    return next(err);
                }
                if (stats.isFile()) {
                    fs.unlink(path, done);
                }
            });
        });
    }, function (err) {
        res.json({ status: true });
    });
};

// Retrieve a file by Id
exports.getFileLinkById = function (req,res){
    models.Course.findOne({ files : req.params.id }).exec()
    .then(function(course){
        models.File.findById(req.params.id).exec()
        .then(function(file){
            var fileUrl = '/upl/' + course._id + '/' + file.name;
            res.redirect(fileUrl);
        });      
    });
};