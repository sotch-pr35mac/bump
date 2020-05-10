module.exports.versionNumber = versionInformation => `${versionInformation.major}.${versionInformation.minor}.${versionInformation.patch}`;

module.exports.date = date => date.toISOString().split('T')[0];

module.exports.changeType = changeType => changeType[0].toUpperCase() + changeType.slice(1);

module.exports.commitMessage = commitMessage => commitMessage.substr(commitMessage.indexOf(' ')+1);

module.exports.removeQuotes = value => value.trim().slice(1, -1);
