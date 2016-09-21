require('babel-polyfill');
const jscodeshift = require('jscodeshift/dist/core');

describe('underscore-to-native', () => {
  const transform = require(`../underscore-to-native.js`);

  it('should use partial imports', () => {
    const source = `
      import _ from 'underscore';
      _.max([1,2]);
    `;
    const expected = `
      import {max} from 'lodash';
      max([1,2]);
    `;
    const result = transform({ source }, { jscodeshift });
    expect(result).toEqual(expected);
  });
  //
  it('should use partial imports for require', () => {
    const source = `
      const _ = require('underscore');
      _.max([1,2]);
    `;
    const expected = `
      import {max} from 'lodash';
      max([1,2]);
    `;
    const result = transform({ source }, { jscodeshift });
    expect(result).toEqual(expected);
  });

  it('should transform special native methods', () => {
    const source = `
      const _ = require('underscore');
      const test = [1,2];
      _.last(test);
      _.first(test);
    `;
    const expected = `
      const test = [1,2];
      test[test.length - 1];
      test[0];
    `;
    const result = transform({ source }, { jscodeshift });
    expect(result).toEqual(expected);
  });

  it('should retain comments', () => {
    const source = `
      // test comment
      const _ = require('underscore');
      // test comment
      const a = require('test');
      const result = _.max([1, 2]);
    `;
    const expected = `
      // test comment
      import {max} from 'lodash';
      // test comment
      const a = require('test');
      const result = max([1, 2]);
    `;
    const result = transform({ source }, { jscodeshift });
    expect(result).toEqual(expected);
  });

  it('should remove the import if no methods left', () => {
    const source = `
      const _ = require('underscore');
      _.forEach([1,2], num => num);
    `;
    const expected = `
      [1,2].forEach(num => num);
    `;
    const result = transform({ source }, { jscodeshift });
    expect(result).toEqual(expected);
  });

  it('should handle complex uses', () => {
    const source = `
      const _ = require('underscore');
      _.forEach([1,2], num => num);
      const test = [1,2,3];
      const result = _.max(test);
    `;
    const expected = `
      import {max} from 'lodash';
      [1,2].forEach(num => num);
      const test = [1,2,3];
      const result = max(test);
    `;
    const result = transform({ source }, { jscodeshift });
    expect(result).toEqual(expected);
  });

  it('should build split imports from require', () => {
    const source = `
      const _ = require('underscore');
      _.max([1,2]);
      _.isUndefined(undefined);
    `;
    const expected = `
      import max from 'lodash/max';
      import isUndefined from 'lodash/isUndefined';
      max([1,2]);
      isUndefined(undefined);
    `;
    const result = transform({ source }, { jscodeshift }, { 'split-imports': true });
    expect(result).toEqual(expected);
  });

  it('should build split imports from import', () => {
    const source = `
      import _ from 'underscore';
      _.max([1,2]);
      _.isUndefined(undefined);
    `;
    const expected = `
      import max from 'lodash/max';
      import isUndefined from 'lodash/isUndefined';
      max([1,2]);
      isUndefined(undefined);
    `;
    const result = transform({ source }, { jscodeshift }, { 'split-imports': true });
    expect(result).toEqual(expected);
  });

  xit('should not override existing scope names', () => {
    const source = `
      import _ from 'underscore';
      var max = 5;
      function nest() {
        const result = _.max(test, 2);
      }
    `;
    const expected = `
      import {max as _max} from 'lodash';
      var max = 5;
      function nest() {
        const result = _max(test, 2);
      }
    `;
    const result = transform({ source }, { jscodeshift });
    expect(result).toEqual(expected);
  });

});
