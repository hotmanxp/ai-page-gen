import { ComponentErrorService } from '../src/services/componentErrorService';

// 测试语法错误
const syntaxError = new Error("SyntaxError: Unexpected token '}'");
syntaxError.message = "SyntaxError: Unexpected token '}'";
const parsedSyntaxError = ComponentErrorService.parseBuildError(syntaxError);
console.log('Syntax Error:', parsedSyntaxError);
console.log('User Friendly Message:', ComponentErrorService.formatUserFriendlyError(parsedSyntaxError));

// 测试依赖错误
const dependencyError = new Error("Module not found: Can't resolve 'missing-library'");
dependencyError.message = "Module not found: Can't resolve 'missing-library'";
const parsedDependencyError = ComponentErrorService.parseBuildError(dependencyError);
console.log('Dependency Error:', parsedDependencyError);
console.log('User Friendly Message:', ComponentErrorService.formatUserFriendlyError(parsedDependencyError));

// 测试未知错误
const unknownError = new Error("Something went wrong during build");
unknownError.message = "Something went wrong during build";
const parsedUnknownError = ComponentErrorService.parseBuildError(unknownError);
console.log('Unknown Error:', parsedUnknownError);
console.log('User Friendly Message:', ComponentErrorService.formatUserFriendlyError(parsedUnknownError));