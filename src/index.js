const core = require('@actions/core');
const fs = require('fs');
const format = require('./format.js');
const utils = require('./utils.js');

const PATCH = require('./defaults.js').PATCH;
const MINOR = require('./defaults.js').MINOR;
const MAJOR = require('./defaults.js').MAJOR;

async function run() {
	try {
		// Read in hte commit messages from pull request merges
		const latestRelease = await utils.getLatestRelease();
		
		// Get all of the commit messages
		const commitMessages = await utils.getCommitMessages(latestRelease);
		console.log(`Commit Messages in Release: ${commitMessages}`);
			
		// Format commit messages for change log and analysis
		const changes = utils.collectChanges(commitMessages);

		// Get the current version number
		const tomlFile = fs.readFileSync('Cargo.toml', 'utf-8');
		const currentVersion = utils.getTomlField(tomlFile, 'version').split('.');

		// Analyze commit messages to determine if breaking change, feature, or patch
		const versionObject = utils.getNextVersion(currentVersion, changes);

		// Check version to determine if changes are required
		if(utils.isNewVersion(versionObject, currentVersion)) {
			// Changes are required, generate the changes
			// Generate the markdown for the changelog
			const markdownLines = utils.generateChangelog(versionObject, changes);
		
			// Modify Changelog
			const changelog = fs.readFileSync('./CHANGELOG.md', 'utf-8');
			const modifiedChangelog = utils.getModifiedChangelog(changelog, markdownLines);
			fs.writeFileSync('./CHANGELOG.md', modifiedChangelog);

			// Modify README
			const readme = fs.readFileSync('./README.md', 'utf-8');
			const modifiedReadme = utils.getModifiedReadme(readme, versionObject);
			fs.writeFileSync('./README.md', modifiedReadme);

			// Modify TOML
			const modifiedToml = utils.getModifiedToml(tomlFile, versionObject);
			fs.writeFileSync('./Cargo.toml', modifiedToml);

			// Set output variables
			core.setOutput('versionNumber', format.versionNumber(versionObject));
			core.setOutput('changeLog', format.releaseNote(markdownLines));

			console.log(`Updated the version to ${format.versionNumber(versionObject)}`);
		} else {
			// No changes need to be made to the version, move on
			console.log('No changes need to be made to the version number or changelog. Moving on...');
		}
	} catch (error) {
 		core.setFailed(error.message);
	}
}

run();
