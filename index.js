var inquirer = require('inquirer');
const log = require('loglevel');
const fs = require('fs');
const dateFormat = require('dateformat');

function readBookingPositions(inFile) {
    return new Promise(function (resolve, reject) {
        const csvReader = require('fast-csv');

        let bookingPositions = [];
        log.info('Setting up csv reader.');
        const csvStream = csvReader.fromStream(fs.createReadStream(inFile), {
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
            log.info(data);
            bookingPositions.push(data);
            log.info("Booking position list now contains: " + bookingPositions.length);
        }).on('end', async (data) => {
            log.info('No more rows.');
            resolve(bookingPositions);
        });
    });
}

function createBookings(bookingPositions, bookings) {
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
        log.info(bookingPositions);
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
    log.info("Booking your booking now.");
    // log.info(bookings);

    const sageBookings = [];
    bookings.forEach(booking => {
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
        log.info(sageBooking);

        sageBookings.push(sageBooking);
    });
    log.info(sageBookings);

    return sageBookings;
}

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

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
    log.info(answers);
    if (answers.getOrBook == "get") {
    }
    else if (answers.getOrBook == "book") {
        readBookingPositions("20180213JBc(Project+Registrations).csv").then(
            (bookingPositions) => {
                const bookingList = [];
                createBookings(bookingPositions, bookingList).then(bookings => {
                    let sageBookings = createSageBookings(bookings);
                });
            });
    }
});