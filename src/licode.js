'use strict';

/* Modules definitions */
angular.module('licode', ['licode-directives', 'licode-services']);
angular.module('licode-directives', ['licode-services', 'licode-strategies']);
angular.module('licode-strategies', ['licode-services']);
angular.module('licode-services', []);

