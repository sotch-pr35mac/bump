const format = require('./format.js');
const exec = require('child_process').exec;

const PATCH = require('./defaults.js').PATCH;
const MINOR = require('./defaults.js').MINOR;
const MAJOR = require('./defaults.js').MAJOR;

module.exports.getTomlField = function(toml, field) {
	const lines = toml.split('\n');
	let value = '';
	for(let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if(line.substr(0, field.length) == field) {
			value = format.removeQuotes(line.split('=')[1]);
			break;
		}
	}

	return value;
}

module.exports.generateChangelog = function(versionInformation, changeList) {
	let lines = [];
	const now = new Date();
	lines.push(`## [${format.versionNumber(versionInformation)}] - ${format.date(now)}`);

	for(const changeType of Object.keys(changeList)) {
		if(changeList[changeType].length > 0) {
			lines.push(`### ${format.changeType(changeType)}`);
			for(let i = 0; i < changeList[changeType].length; i++) {
				let commitMessage = changeList[changeType][i];
				lines.push(`- ${format.commitMessage(commitMessage)}`);
			}
			lines.push('');
		}
	}

	return lines;
}

module.exports.execute = function(command, callback) {
	exec(command, function(error, stdout, stderr) {
		callback(stdout);
	});
}

module.exports.getLatestRelease = commitHashes => commitHashes.split('\n')[0];

module.exports.getRecentCommits = function(commitList, latestRelease) {
	let newCommits = [];
	for(let i = 0; i < commitList.length; i++) {
		const currentCommit = commitList[i];
		if(!currentCommit.includes(latestRelease)) {
			const commitMessage = currentCommit.substr(currentCommit.indexOf(' ')+1);
			newCommits.push(commitMessage);
		} else {
			break;
		}
	}

	return newCommits;
}

module.exports.collectChanges = function(newCommits) {
	let changes = {
		added: [],
		changed: [],
		depcrecated: [],
		removed: [],
		fixed: [],
		security: []
	};

	for(const changeType of Object.keys(changes)) {
		let listOfChanges = newCommits.filter(message => message.substr(0, message.indexOf(' ')) == `[${changeType}]`);
		changes[changeType] = listOfChanges;
	}

	return changes;
}

module.exports.getNextVersion = function(currentVersion, changes) {
	let versionObject = {
		major: currentVersion[0],
		minor: currentVersion[1],
		patch: currentVersion[2]
	};

	const minimumBumpRequired = {
		'added': MINOR,
		'changed': PATCH,
		'deprecated': PATCH,
		'removed': MAJOR,
		'fixed': PATCH,
		'security': PATCH
	};

	let bump = 0;
	for(const changeType of Object.keys(changes)) {
		if(changes[changeType].length > 0) {
			bump = bump < minimumBumpRequired[changeType] ? minimumBumpRequired[changeType] : bump;
		}
	}

	switch (bump) {
		case PATCH:
			versionObject.patch = parseInt(versionObject.patch) + 1;
		case MINOR:
			versionObject.minor = parseInt(versionObject.minor) + 1;
			versionObject.patch = 0;
		case MAJOR:
			versionObject.major = parseInt(versionObject.major) + 1;
			versionObject.minor = 0;
			versionObject.patch = 0;
	}

	return versionObject;
}

module.exports.getModifiedChangelog = function(changelog, markdownChanges) {
	let changelogLines = changelog.split('\n');
	let changelogHeader = changelogLines.slice(0, 3);
	let previousReleaseChanges = changelogLines.slice(3);
	return changelogHeader.concat(markdownChanges.concat(previousReleaseChanges)).join('\n');
}

module.exports.getModifiedReadme = function(readme, versionObject) {
	let readmeLines = readme.split('\n');
	readmeLines[1] = `##### v${format.versionNumber(versionObject)}`;
	return readmeLines.join('\n');	
}

module.exports.getModifiedToml = function(toml, versionObject) {
	let tomlLines = toml.split('\n');
	let versionIndex;
	for(let i = 0; i < tomlLines.length; i++) {
		if(tomlLines[i].includes('version = ')) {
			versionIndex = i;
			break;
		}
	}
	tomlLines[versionIndex] = `version = "${format.versionNumber(versionObject)}"`;
	return tomlLines.join('\n');
}
