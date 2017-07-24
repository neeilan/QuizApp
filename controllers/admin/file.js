const async = require('async'),
    config = require('../../lib/config'),
    fs = require('fs-extra'),
    models = require('../../models'),
    mongoose = require('mongoose'),
    path = require('path');
// Retrieve file
exports.getFileByParam = (req, res, next, id) => {
    models.File.findById(id, (err, file) => {
        if (err)
            return next(err);
        if (!file)
            return next(new Error('No file is found.'));
        req.fil3 = file; // careful: req.file is used by multer
        next();
    });
};
// Retrieve all files in the course
exports.getFiles = (req, res) => {
    req.course.withFiles().execPopulate().then(() => {
        res.render('admin/pages/course-files', {
            bodyClass: 'files',
            title: 'Files',
            course: req.course
        });
    });
};
// Add new files
exports.addFiles = (req, res) => {
    async.eachSeries(req.files, (obj, done) => {
        var file = new models.File();
        file.store(obj).save(err => {
            if (err)
                return done(err);
            req.course.update({ $push: { files: file._id }}, done);
        });
    }, err => {
        if (err)
            req.flash('error', 'An error occurred while trying to perform operation.');
        else
            req.flash('success', 'The files have been added.');
        res.redirect(`/admin/courses/${req.course._id}/files`);
    });
};
// Delete specific files from course
exports.deleteFiles = (req, res) => {
    let dir = `${config.uploadPath}/${req.course.id}`;
    async.eachSeries(req.body.files, (id, done) => {
        async.waterfall([
            done => {
                models.File.findById(id, (err, file) => {
                    if (err)
                        return done(err);
                    if (!file)
                        return done(new Error('no file'));
                    done(null, file);
                });
            },
            (file, done) => {
                file.remove(err => {
                    if (err)
                        return done(err);
                    done(null, file);
                });
            },
            (file, done) => {
                let filename = path.resolve(`${dir}/${file.name}`);
                fs.stat(filename, (err, stats) => {
                    if (err && err.code === 'ENOENT')
                        return done();
                    else if (err)
                        return done(err);
                    else if (stats.isFile())
                        fs.remove(filename, done);
                    else
                        return done();
                });
            }
        ], done);
    }, err => {
        if (err) 
            req.flash('error', 'An error occurred while trying to perform operation.');
        else
            req.flash('success', 'The files have been deleted.');
        res.sendStatus(200);
    });
};