const core = require('@actions/core');
const fs = require('fs');
const format = require('./format.js');
const utils = require('./utils.js');

const PATCH = require('./defaults.js').PATCH;
const MINOR = require('./defaults.js').MINOR;
const MAJOR = require('./defaults.js').MAJOR;

try {
	// DEBUG
	utils.execute('git status', function(output) {
		console.log("This is the output of git status");
		console.log(output);
	});
	utils.execute('git log', function(output) {
		console.log('This is the output of git log');
		console.log(output);
	});

	// Read in the commit messages from pull request merges
	utils.execute(`git log --grep="Merge pull request " --format='%H'`, function(commitHashes) {
		console.log(commitHashes.length)
		// Get all the commit messages
		utils.execute("git log --format='oneline'", function(commitHistory) {
			const latestRelease = utils.getLatestRelease(commitHashes);
			const commitList = commitHistory.split('\n');
			
			// Get all the commit messages made since the last pull reuqest was merged
			const newCommits = utils.getRecentCommits(commitList, latestRelease);

			console.log(`New commits: ${newCommits.length}`);

			// Format commit messages for change log
			const changes = utils.collectChanges(newCommits);
			
			// Get the current version number
			const tomlFile = fs.readFileSync('Cargo.toml', 'utf-8');
			const currentVersion = utils.getTomlField(tomlFile, 'version').split('.');
			// Analyze commit messages to determine if breaking change, feature, or patch
			const versionObject = utils.getNextVersion(currentVersion, changes);

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

			console.log(modifiedChangelog);

			// TODO: Commit Change
			// TODO: Merge Commit
		});
	});
} catch (error) {
	core.setFailed(error.message);
}
