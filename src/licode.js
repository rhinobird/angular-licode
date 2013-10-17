'use strict';

/* Modules definitions */
angular.module('pl-licode', ['pl-licode-directives', 'pl-licode-services']);
angular.module('pl-licode-directives', ['pl-licode-services', 'pl-licode-strategies']);
angular.module('pl-licode-strategies', ['pl-licode-services']);
angular.module('pl-licode-services', []);

