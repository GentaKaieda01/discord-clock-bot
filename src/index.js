require('dotenv').config();
//Allows us to use Discord commands by grabbing it from the node_modules
const Discord = require('discord.js');

//Gets all the information for our token and prefix from the config.json file 
//const { prefix, token } = require('./config.json');

//Allows user to use discord commands with the client
const client = new Discord.Client();


client.once('ready', () => {
    console.log('Ready!');
});

//Create a map to store the users time and username
let usernames = new Map();


//Used to get the message the user sent
client.on('message', message => {
    //If the message is !on-duty check to see who is on duty.
    if (message.content.toLocaleLowerCase() === `${process.env.PREFIX}on-duty`) {
        let embed = new Discord.MessageEmbed();
        embed.setColor("#03e8fc");
        //Delete the on-duty message
        message.delete({ timeout: 1000 });
        //If there is no one on duty message the channel that no one is online
        if (usernames.size == 0) {
            embed.setTitle("No one is on duty right now :/");
            message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: 60000 }) });
        }
        //If one persion is on-duty message the channel that the one person is online 
        else if (usernames.size == 1) {
            usernames.forEach(function (key, value) {
                embed.setDescription("<@" + value.id + ">");
            });
            embed.setTitle("Is online and on duty");
            message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: 60000 }) });
        }
        //If there is mulitple TA's online then get all the TA's and display them
        else {
            let ta_names = "";
            usernames.forEach(function (key, value) {
                ta_names += "<@" + value.id + ">";
            });
            embed.setDescription(ta_names);
            embed.setTitle("Are Clocked in and on duty! ");
            message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: 60000 }) });
        }
        return;
    }

    if (message.content.toLowerCase() === `${process.env.PREFIX}help-student`) {
        message.delete({ timeout: 1000 });
        var descrption = "To check who is online, available, and on duty type the command: !on-duty \n";
        let embed = new Discord.MessageEmbed();
        embed.setTitle("Clock-Bot Mannual for Students");
        embed.addField("On-Duty Command:", descrption);
        embed.addField("TA-Schedule", "https://www.utrgv.edu/csci/academics/ta-center/index.htm");
        embed.addField("Notes:", "You can also know who is on-duty by checking the bar on the right (they should have the role on-duty). \n The blue message indicates the on-duty messages! \n\n The benefit of using the on-duty command is that it pings all the TA's that are on-duty so they get a notification! \n\n You must start each command with a '!'. The commands are NOT case sensitve. You can type in any command with capitals and it will still accept the command. \n\n If you have any suggestions on making the bot better contact GentaKaieda#5381 on discord :-)");
        embed.setColor("#94efff");
        message.channel.send(embed).then(d_embed => { d_embed.delete({ timeout: 60000 }) });
        return;
    }

    //Check if the user has permission to do the command 
    if (message.member.hasPermission(['KICK_MEMBERS', 'BAN_MEMBERS'])) {
        //If the message is sent by the bot dont do anything just reutrn
        if (message.author.bot) return;
        //Create a bool value that checks if the user is already clocked-in
        let exist = false;
        //Create a time variable that gets the time in string format
        let time = getTimeString();
        //Create a user variable that gets the username of the message writer in string format
        let user = message.author;
        //Create a embeded message object 
        let embed = new Discord.MessageEmbed();
        //Gets the message and omitts case seneitivity / checks if the message says !clock-in or not
        if (message.content.toLocaleLowerCase().startsWith(`${process.env.PREFIX}clock-in`)) {
            //Gets the message the user sent and get the time they are clocked in for
            let clock_message = message.content;
            //If the clock in message has more than 16 characters dont accept the string because of formatting
            if (clock_message.length >= 16) {
                message.delete({ timeout: 5000 });
                embed.setTitle("Error!")
                embed.setDescription("Clock-in command has too many characters. \nIf you need more assistance type the command: !help-ta");
                embed.setColor("#ffaa00");
                message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: 10000 }) }); //timeout: 10000
                return;
            }
            //Gets the message and only get the numbers from the string
            new_message = getSubString(clock_message);
            //Gets the time (string) and convert it to a list of ints seperating the hours and minutes
            var arr = convertToInt(new_message);
            //Gets the array of the hours and minutes and converts it to an array of miliseconds
            var new_arr = milisecondsConverter(arr);
            //Check if the user has put the correct format. If they did not send a message that tells them they got the wrong format.
            if (Number.isNaN(new_arr[0]) || Number.isNaN(new_arr[1])) {
                message.delete({ timeout: 5000 });
                embed.setTitle("Error!")
                embed.setDescription("Please enter the time in correct format. \nIf you need more asstiance type the command: !help-ta");
                embed.setColor("#ffaa00");
                message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: 10000 }) });
                return;
            }

            //If there is one or more users clocked-in than check if the user is alreay clocked-in
            if (usernames.size >= 1) {
                usernames.forEach(function (key, value) {
                    if (value.id === message.author.id) {
                        message.delete({ timeout: 5000 });
                        embed.setTitle("Error!")
                        embed.setDescription("You're already clocked in. Did you mean clock out?");
                        embed.setColor("#ffaa00");
                        message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: 10000 }) });
                        //If the user already exists change the value to true
                        exist = true;
                    }
                });
                //If the user already existed return and do nothing. If the user did not exist create the new user.
                if (exist) {
                    return;
                }
                else {
                    usernames.set(user, time);
                    let { cache } = message.guild.roles;
                    let role = cache.find(role => role.name.toLowerCase() === "on-duty");
                    message.member.roles.add(role);
                    message.delete({ timeout: 1000 });
                    embed.setAuthor(message.author.username, message.author.displayAvatarURL());
                    embed.setTitle("Clocked in");
                    if (arr[0] === 0) {
                        embed.setDescription("On duty for: " + arr[1] + "minutes");
                    }
                    else if (arr[0] === 1 && arr[1] > 0) {
                        embed.setDescription("On duty for: " + arr[0] + "hour and " + arr[1] + "minutes");
                    }
                    else if (arr[0] > 1 && arr[1] > 0) {
                        embed.setDescription("On duty for: " + arr[0] + "hours and " + arr[1] + "minutes");
                    }
                    else if (arr[0] === 1 && arr[1] === 0) {
                        embed.setDescription("On duty for: " + arr[0] + "hour");
                    }
                    else if (arr[0] > 1 && arr[0] === 0) {
                        embed.setDescription("On duty for: " + arr[0] + "hours");
                    }
                    embed.setTimestamp();
                    embed.setColor("#05ff22");
                    message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: new_arr[0] + new_arr[1] }) });
                }

            }
            //If the user is the first person clocking-in
            else {
                usernames.set(user, time);
                let { cache } = message.guild.roles;
                let role = cache.find(role => role.name.toLowerCase() === "on-duty");
                message.member.roles.add(role);
                message.delete({ timeout: 1000 });
                embed.setAuthor(message.author.username, message.author.displayAvatarURL());
                embed.setTitle("Clocked in");
                if (arr[0] === 0) {
                    embed.setDescription("On duty for: " + arr[1] + "minutes");
                }
                else if (arr[0] === 1 && arr[1] > 0) {
                    embed.setDescription("On duty for: " + arr[0] + "hour and " + arr[1] + "minutes");
                }
                else if (arr[0] > 1 && arr[1] > 0) {
                    embed.setDescription("On duty for: " + arr[0] + "hours and " + arr[1] + "minutes");
                }
                else if (arr[0] === 1 && arr[1] === 0) {
                    embed.setDescription("On duty for: " + arr[0] + "hour");
                }
                else if (arr[0] > 1 && arr[0] === 0) {
                    embed.setDescription("On duty for: " + arr[0] + "hours");
                }
                embed.setTimestamp();
                embed.setColor("#05ff22");
                message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: new_arr[0] + new_arr[1] }) });
                //message.channel.send(msg_send).then(d_msg => { d_msg.delete({ timeout: new_arr[0] + new_arr[1] }) });
            }
            //Check that the map is correctly being inputted 
            console.log(usernames);
        }
        //If the message is !clock-out then pop the user out of the array.
        if (message.content.toLocaleLowerCase() === `${process.env.PREFIX}clock-out`) {
            //Create a bool variable that checks if the user is checked-in 
            let exist = false;
            //Check if they exist in the map.
            if (usernames.size >= 0) {
                usernames.forEach(function (key, value) {
                    if (value.id === message.author.id) {
                        message.delete({ timeout: 1000 });
                        let { cache } = message.guild.roles;
                        let role = cache.find(role => role.name.toLowerCase() === "on-duty");
                        message.member.roles.remove(role);
                        embed.setAuthor(message.author.username, message.author.displayAvatarURL());
                        embed.setTitle("Clocked out");
                        embed.setTimestamp();
                        embed.setColor("#f50000");
                        message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: 300000 }) });
                        usernames.delete(user);
                        exist = true;
                    }
                });
                //If the user existed return and do nothing. If the user did not exist create ask the user if they clocked in.
                if (exist) {
                    return;
                }
                else {
                    message.delete({ timeout: 5000 });
                    embed.setTitle("Error!")
                    embed.setDescription("Are you sure you clocked in? You don't seem to come up in TA's that are clocked in. \nIf you need more asstiance type the command: !help-ta");
                    embed.setColor("#ffaa00");
                    message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: 10000 }) });
                }

            }
            //Check if the user was properly deleted
            console.log(usernames);
        }
        //If the message is !help-ta show a list of the commands.
        if (message.content.toLowerCase() === `${process.env.PREFIX}help-ta`) {
            message.delete({ timeout: 1000 });
            var description_in = "To clock in, type the command: !clock-in followed by a space and then a *time* of how long you are clocked in for. \n"
            description_in += " \n The *time* format should be whatever many hours youre working seperated by a ':' and then however many minutes. \n\n Example 1: If you're working for an hour, you would type the command: !clock-in 01:00";
            description_in += " \n Example 2: If you want to clock in for 1hour and 30min you would type the command: !clock-in 01:30";
            description_in += " \n Example 3: If you want to clock in for only 30min you type the command: !clock-in 00:30";
            var description_out = "To clock out, type the command: !clock-out \n";
            description_out += " \n Example 1: To clock out type the command: !clock-out";
            let embed = new Discord.MessageEmbed();
            embed.setTitle("Clock-Bot Manual for TA's");
            embed.addField("Clock-in Command:", description_in);
            embed.addField("Clock-out Command:", description_out);
            embed.addField("Notes:", "You must start each command with a '!'. The commands are NOT case sensitve. You can type in any command with capitals and it will still accept the command. \n\n If you get a green message: you clocked-in successfully! \n If you get a red message: you clocked-out sucessfully! \n If you get a orange message: the command had an error in formatting!");
            embed.setColor("#94efff");
            message.channel.send(embed).then(d_embed => { d_embed.delete({ timeout: 60000 }) });
        }
    }
    else {
        let embed = new Discord.MessageEmbed();
        message.delete({ timeout: 5000 });
        embed.setTitle("Error!")
        embed.setDescription("Hey! You aren't a TA. \n If you need more assitance type the command: !help-student");
        embed.setColor("#ffaa00");
        message.channel.send(embed).then(d_msg => { d_msg.delete({ timeout: 10000 }) });
    }
});
//Allows the client to login to the specified server
client.login(process.env.BOT_TOKEN);

//Gets the exact time in string format found code on stack overflow @ https://stackoverflow.com/questions/35324512/get-exact-time-in-javascript 
var getTimeString = function (input, separator) {
    var pad = function (input) { return input < 10 ? "0" + input : input; };
    var date = input ? new Date(input) : new Date();
    return [
        pad(date.getHours()),
        pad(date.getMinutes())
    ].join(typeof separator !== 'undefined' ? separator : ':');
}

//Gets the message and gets the time only i.e. if the message was !clock-in 1:00 it will return the string 1:00
function getSubString(timestring) {
    var new_time = timestring.substring(10, timestring.length);
    return new_time;
}

//Gets the time (string) and make it a list of ints holding the hour and minutes in index 0 and 1
function convertToInt(str) {
    var arr = str.split(':');
    arr[0] = parseInt(arr[0]);
    arr[1] = parseInt(arr[1]);
    return arr;
}

//Since timeout takes the time in miliseconds we have to convert the hours and minutes we have to miliseconds
function milisecondsConverter(arr1) {
    //1000 miliseconds = 1 second
    //60,000 miliseconds = 1min
    //3,600,000 = 1 hour
    var arr2 = [];
    arr2.push(arr1[0] * 3600000);
    arr2.push(arr1[1] * 60000);
    return arr2;
}
