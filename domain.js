/*eslint no-process-env:0*/
/*global require, exports*/

(function () {
  'use strict';

  var fs = require('fs');
  var CLIEngine = require('eslint').CLIEngine;
  var cli = new CLIEngine();
  var currentProjectRoot = null;
  var domainName = 'zaggino.brackets-eslint';
  var domainManager = null;
  var noop = function () {};

  function _setProjectRoot(projectRoot) {
    var opts = {};
    var rulesDirPath;
    var ignorePath;

    if (projectRoot) {
      rulesDirPath = projectRoot + '.eslintrules';
      try {
        if (fs.statSync(rulesDirPath).isDirectory()) {
          opts.rulePaths = [rulesDirPath];
        }
      } catch (e) {
        // no action required
        noop(e);
      }

      ignorePath = projectRoot + '.eslintignore';
      try {
        if (fs.statSync(ignorePath).isFile()) {
          opts.ignore = true;
          opts.ignorePath = ignorePath;
        }
      } catch (e) {
        // no action required
        noop(e);
      }
    }

    cli = new CLIEngine(opts);
  }

  require('enable-global-packages').on('ready', function () {
    // global packages are available now
    _setProjectRoot(currentProjectRoot);
  });

  function lintFile(fullPath, projectRoot, callback) {
    if (projectRoot !== currentProjectRoot) {
      _setProjectRoot(projectRoot);
      currentProjectRoot = projectRoot;
    }
    fs.readFile(fullPath, {encoding: 'utf8'}, function (err, text) {
      if (err) {
        return callback(err);
      }
      var relativePath = fullPath.indexOf(projectRoot) === 0 ? fullPath.substring(projectRoot.length) : fullPath;

      // this is important for ESLint so .eslintrc is properly loaded
      // we could go around this by parsing .eslintrc manually but that'd
      // bring complexity we don't need here right now
      process.chdir(projectRoot);

      var res;
      try {
        res = cli.executeOnText(text, relativePath);
      } catch (e) {
        err = e.toString();
      }
      callback(err, res);
    });
  }

  exports.init = function (_domainManager) {
    domainManager = _domainManager;

    if (!domainManager.hasDomain(domainName)) {
      domainManager.registerDomain(domainName, {
        major: 0,
        minor: 1
      });
    }

    domainManager.registerCommand(
      domainName,
      'lintFile', // command name
      lintFile, // handler function
      true, // is async
      'lint given file with eslint', // description
      [
        {
          name: 'fullPath',
          type: 'string'
        },
        {
          name: 'projectRoot',
          type: 'string'
        }
      ], [
        {
          name: 'report',
          type: 'object'
        }
      ]
    );

  };

}());
