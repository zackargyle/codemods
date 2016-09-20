const NATIVE_METHODS = {
  forEach: 'forEach',
  each: 'forEach',
  map: 'map',
  filter: 'filter',
  select: 'filter',
  every: 'every',
  some: 'some',
  contains: 'includes',
  reduce: 'reduce',
  indexOf: 'indexOf',
  lastIndexOf: 'lastIndexOf',
  first: (j, identifier) => j.memberExpression(identifier, j.literal(0)),
  last: (j, identifier) => j.memberExpression(identifier,
    j.binaryExpression('-',
      j.memberExpression(identifier, j.identifier('length')),
      j.literal(1)
    )
  ),
}

/**
 * This replaces every occurence of variable "foo".
 */
module.exports = function(fileInfo, { jscodeshift: j }) {
  const ast = j(fileInfo.source);
  j.__methods = {};

  // TODO: look for scoped variables with matching names

  ast
    .find(j.CallExpression)
    .filter(isUnderscoreExpression)
    .forEach(transformExpression(j));

  // const _ = require('underscore')
  ast
    .find(j.VariableDeclaration)
    .filter(isUnderscoreRequire)
    .forEach(transformRequire(j));

  // import _ from 'underscore'
  ast
    .find(j.ImportDeclaration)
    .filter(isUnderscoreImport)
    .forEach(transformImport(j));

  return ast.toSource({
    arrowParensAlways: true,
    quote: 'single',
  });
}

function isUnderscoreExpression({ node }) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object &&
    node.callee.object.name === '_'
  );
}

function isUnderscoreRequire({ node }) {
  return (
    node.type === 'VariableDeclaration' &&
    node.declarations.length > 0 &&
    node.declarations[0].type === 'VariableDeclarator' &&
    node.declarations[0].init &&
    node.declarations[0].init.type === 'CallExpression' &&
    node.declarations[0].init.callee &&
    node.declarations[0].init.callee.name === 'require' &&
    node.declarations[0].init.arguments[0].value === 'underscore'
  );
}

function isUnderscoreImport({ node }) {
  return (
    node.type === 'ImportDeclaration' &&
    node.source.value === 'underscore'
  );
}

function transformExpression(j) {
  return (ast) => {
    const methodName = ast.node.callee.property.name;
    const nativeMapping = NATIVE_METHODS[methodName];
    if (nativeMapping) {
      if (typeof nativeMapping === 'function') {
        transformNativeSpecial(j, ast);
      } else {
        transformNativeMethod(j, ast);
      }
    } else {
      transformUnderscoreMethod(j, ast);
    }
  };
}

function transformNativeSpecial(j, ast) {
  const methodName = ast.node.callee.property.name;
  const nativeMapping = NATIVE_METHODS[methodName];
  j(ast).replaceWith(nativeMapping(j, ast.node.arguments[0]));
}

function transformNativeMethod(j, ast) {
  const methodName = ast.node.callee.property.name;
  const nativeMapping = NATIVE_METHODS[methodName];
  j(ast).replaceWith(
    j.callExpression(
      j.memberExpression(
        ast.node.arguments[0], j.identifier(nativeMapping)
      ),
      ast.node.arguments.slice(1)
    )
  );
}

function transformUnderscoreMethod(j, ast) {
  const methodName = ast.node.callee.property.name;
  j.__methods[methodName] = true;
  j(ast).replaceWith(
    j.callExpression(j.identifier(methodName), ast.node.arguments)
  );
}

function transformRequire(j) {
  return (ast) => {
    const methods = Object.keys(j.__methods);
    if (methods.length === 0) {
      j(ast).remove();
    } else {
      j(ast).replaceWith(
        j.importDeclaration(
          methods.map(methodName => {
            return j.importSpecifier(j.identifier(methodName));
          }),
          j.literal('lodash')
        )
      );
    }
  };
}

function transformImport(j) {
  return (ast) => {
    ast.node.source = j.literal('lodash');
    const methods = Object.keys(j.__methods);
    if (methods.length === 0) {
      j(ast).remove();
    } else {
      ast.node.specifiers = methods.map(methodName => {
        return j.importSpecifier(j.identifier(methodName));
      });
    }
  };
}
