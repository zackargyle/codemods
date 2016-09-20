require('babel-polyfill');
const jscodeshift = require('jscodeshift/dist/core');

describe('underscore-to-native', () => {
  const transform = require(`../underscore-to-native.js`);

  it('should use partial imports', () => {
    const source = `
      import _ from 'underscore';
      _.find([1,2], 2);
    `;
    const expected = `
      import {find} from 'lodash';
      find([1,2], 2);
    `;
    const result = transform({ source }, { jscodeshift });
    expect(result).toEqual(expected);
  });

  it('should use partial imports for require', () => {
    const source = `
      const _ = require('underscore');
      _.find([1,2], 2);
    `;
    const expected = `
      import {find} from 'lodash';
      find([1,2], 2);
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
      const result = _.find(test, 2);
    `;
    const expected = `
      import {find} from 'lodash';
      [1,2].forEach(num => num);
      const test = [1,2,3];
      const result = find(test, 2);
    `;
    const result = transform({ source }, { jscodeshift });
    expect(result).toEqual(expected);
  });

});
