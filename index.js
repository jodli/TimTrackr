var inquirer = require('inquirer');
const log = require('loglevel');
const fs = require('fs');
const dateFormat = require('dateformat');
const csv = require('fast-csv');
const Table = require('cli-table2');
const ProgressBar = require('progress');
const SageBooker = require('../SAGE-BookingSimulator');

require('dotenv').config();

function readBookingPositions(inFile) {
    return new Promise(function (resolve, reject) {
        let bookingPositions = [];
        log.info('Reading projects and registrations from file: ' + inFile);
        if (!fs.existsSync(inFile)) {
            reject("File does not exist.");
        }
        else {
            const projectsAndRegistrationsFile = fs.createReadStream(inFile);
            const csvStream = csv.fromStream(projectsAndRegistrationsFile, {
                delimiter: ';',
                headers: true,
                comment: '#',
                ignoreEmpty: true
            }).transform(function (data) {
                return {
                    "Project": data.Project,
                    "Registrations": data.Registrations.split(",")
                }
            }).on('data', async (data) => {
                log.trace(data);
                bookingPositions.push(data);
                log.trace("Booking position list now contains: " + bookingPositions.length);
            }).on('end', async (data) => {
                log.trace('No more rows.');
                log.trace("Read " + bookingPositions.length + " projects and their registrations.");
                resolve(bookingPositions);
            });
        }
    });
}

function createBookings(bookingPositions, bookings) {
    bookings = bookings || [];
    return createMoreBookings(bookingPositions, bookings).then(moreBookings => {
        if (moreBookings) {
            return createBookings(bookingPositions, bookings);
        } else {
            return bookings;
        }
    });
}

function createMoreBookings(bookingPositions, bookings) {
    return new Promise(function (resolve, reject) {
        createNewBooking(bookingPositions).then(booking => {
            if (booking) {
                bookings.push(booking);
            }

            var moreBookingsFunction = inquirer.createPromptModule();
            moreBookingsFunction([{
                type: "confirm",
                name: "moreBookings",
                message: "More bookings?"
            }]).then(answers => {
                resolve(answers.moreBookings);
            });
        });
    });
}

function createNewBooking(bookingPositions) {
    return new Promise(function (resolve, reject) {
        let booking = {};
        log.trace(bookingPositions);
        var selectProject = inquirer.createPromptModule();
        selectProject([{
            type: "list",
            name: "project",
            message: "Which project?",
            choices: bookingPositions.map(x => x.Project)
        }]).then(answers => {
            booking.project = answers.project;
            //log.info(booking);
            var selectRegistration = inquirer.createPromptModule();
            selectRegistration([{
                type: "list",
                name: "registration",
                message: "Which registration?",
                choices: bookingPositions.filter(x => x.Project == answers.project)[0].Registrations
            }]).then(answers => {
                booking.registration = answers.registration;
                //log.info(booking);
                var selectDate = inquirer.createPromptModule();
                selectDate.registerPrompt('datetime', require('inquirer-datepicker-prompt'));
                selectDate([{
                    type: "datetime",
                    name: "date",
                    message: "On what date?",
                    format: ['dd', '.', 'mm', '.', 'yyyy']
                }]).then(answers => {
                    booking.date = answers.date;
                    //log.info(booking);
                    var selectDuration = inquirer.createPromptModule();
                    selectDuration.registerPrompt('datetime', require('inquirer-datepicker-prompt'));
                    selectDuration([{
                        type: "datetime",
                        name: "duration",
                        message: "For how long?",
                        initial: new Date(0, 0, 0, 0, 0, 0, 0),
                        time: {
                            min: '12:15 AM',
                            max: '03:00 PM',
                            minutes: {
                                interval: 15
                            }
                        },
                        format: ['HH', ':', 'MM']
                    }]).then(answers => {
                        booking.duration = answers.duration.toLocaleTimeString("de-DE");
                        // log.info(booking);
                        var enterComment = inquirer.createPromptModule();
                        enterComment([{
                            type: "input",
                            name: "comment",
                            message: "What did you do?"
                        }]).then(answers => {
                            booking.comment = answers.comment;
                            //log.info(booking);
                            var confirm = inquirer.createPromptModule();
                            confirm([{
                                type: "confirm",
                                name: "confirm",
                                message: "Is this correct?"
                            }]).then(answers => {
                                //log.info(booking);
                                if (answers.confirm) {
                                    resolve(booking);
                                } else {
                                    resolve(null);
                                }
                            });
                        });
                    });
                });
            });
        });
    });
}

function createSageBookings(bookings) {
    var table = new Table({
        head: ['Project', 'Registration', 'Date', 'Duration', 'Comment']
    });

    const sageBookings = [];
    bookings.forEach(booking => {
        table.push([
            booking.project, booking.registration,
            convertDate(booking.date), booking.duration,
            booking.comment
        ]);

        let sageBooking = {};

        function convertDate(date) {
            let convertedDate = dateFormat(date, "dd.mm.yyyy");
            return convertedDate;
        }

        function convertDuration(duration) {
            let convertedDuration = duration.split(":");
            convertedDuration = convertedDuration[0] + convertedDuration[1];
            return convertedDuration;
        }

        sageBooking.Project = booking.project;
        sageBooking.Registration = booking.registration;
        sageBooking.Date = convertDate(booking.date);
        sageBooking.Duration = convertDuration(booking.duration);
        sageBooking.Comment = booking.comment;
        // log.info(sageBooking);

        sageBookings.push(sageBooking);
    });
    // log.info(sageBookings);
    log.info(table.toString());

    return sageBookings;
}

function writeSageBookings(outFile, sageBookings) {
    csv.writeToStream(fs.createWriteStream(outFile), sageBookings, {
        headers: true,
        delimiter: ';'
    });

    log.trace("Sage Bookings written to file: " + outFile);
}

log.setLevel('info');
var selectFunction = inquirer.createPromptModule();
selectFunction([{
    type: "list",
    name: "getOrBook",
    message: "What do you want, bro?",
    choices: [{
        name: "Get projects and booking positions",
        value: "get"
    },
    {
        name: "Define and book project times",
        value: "book"
    }]
}]).then(answers => {
    log.trace(answers);
    if (answers.getOrBook == "get") {
        var bar = undefined;
        const sageBooker = new SageBooker();
        sageBooker.on('start', async (totalProjects) => {
            bar = new ProgressBar('Getting projects... [:bar] :current/:total :etas', {
                total: totalProjects
            });
        }).on('data', async (project, registration) => {
            bar.tick();
            // log.info(project);
            // log.info(registration);
        }).on('end', async () => {
            log.info("\nDone");
        });
        sageBooker.getProjects("Projects+Registrations.csv", {
            interactiveMode: true
        });
    } else if (answers.getOrBook == "book") {
        readBookingPositions("Projects+Registrations.csv").then(
            (bookingPositions) => {
                createBookings(bookingPositions).then(bookings => {
                    log.trace(bookings);
                    const sageBookings = createSageBookings(bookings);
                    writeSageBookings("out.csv", sageBookings);

                    var confirmBookings = inquirer.createPromptModule();
                    confirmBookings([{
                        type: "confirm",
                        name: "confirmBookings",
                        message: "Do you really want to book this?"
                    }]).then(answers => {
                        if (answers.confirmBookings) {
                            const bar = new ProgressBar('Booking times... [:bar] :current/:total :etas', {
                                total: sageBookings.length
                            });
                            const sageBooker = new SageBooker();
                            sageBooker.on('data', async (data) => {
                                bar.tick();
                                // log.info(data);
                            }).on('end', async () => {
                                log.info("\nDone");
                            });
                            sageBooker.bookProjects("out.csv", {
                                interactiveMode: true
                            });
                        }
                    });
                });
            }).catch(message => {
                log.error(message);
            });
    }
});