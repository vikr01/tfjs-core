/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as tf from './index';
import {describeWithFlags} from './jasmine_util';
import {Tensor} from './tensor';
import {NamedTensorMap} from './tensor_types';
import {flattenNameArrayMap, getTensorsInContainer, isTensorInList, unflattenToNameArrayMap} from './tensor_util';
import {convertToTensor} from './tensor_util_env';
import {ALL_ENVS, expectArraysClose, expectNumbersClose} from './test_util';

describe('tensor_util.isTensorInList', () => {
  it('not in list', () => {
    const a = tf.scalar(1);
    const list: Tensor[] = [tf.scalar(1), tf.tensor1d([1, 2, 3])];

    expect(isTensorInList(a, list)).toBe(false);
  });

  it('in list', () => {
    const a = tf.scalar(1);
    const list: Tensor[] = [tf.scalar(2), tf.tensor1d([1, 2, 3]), a];

    expect(isTensorInList(a, list)).toBe(true);
  });
});

describe('tensor_util.flattenNameArrayMap', () => {
  it('basic', () => {
    const a = tf.scalar(1);
    const b = tf.scalar(3);
    const c = tf.tensor1d([1, 2, 3]);

    const map: NamedTensorMap = {a, b, c};
    expect(flattenNameArrayMap(map, Object.keys(map))).toEqual([a, b, c]);
  });
});

describe('tensor_util.unflattenToNameArrayMap', () => {
  it('basic', () => {
    const a = tf.scalar(1);
    const b = tf.scalar(3);
    const c = tf.tensor1d([1, 2, 3]);

    expect(unflattenToNameArrayMap(['a', 'b', 'c'], [
      a, b, c
    ])).toEqual({a, b, c});
  });
});

describe('getTensorsInContainer', () => {
  it('null input returns empty tensor', () => {
    const results = getTensorsInContainer(null);

    expect(results).toEqual([]);
  });

  it('tensor input returns one element tensor', () => {
    const x = tf.scalar(1);
    const results = getTensorsInContainer(x);

    expect(results).toEqual([x]);
  });

  it('name tensor map returns flattened tensor', () => {
    const x1 = tf.scalar(1);
    const x2 = tf.scalar(3);
    const x3 = tf.scalar(4);
    const results = getTensorsInContainer({x1, x2, x3});

    expect(results).toEqual([x1, x2, x3]);
  });

  it('can extract from arbitrary depth', () => {
    const container = [
      {x: tf.scalar(1), y: tf.scalar(2)},
      [[[tf.scalar(3)]], {z: tf.scalar(4)}]
    ];
    const results = getTensorsInContainer(container);
    expect(results.length).toBe(4);
  });

  it('works with loops in container', () => {
    const container = [tf.scalar(1), tf.scalar(2), [tf.scalar(3)]];
    const innerContainer = [container];
    // tslint:disable-next-line:no-any
    container.push(innerContainer as any);
    const results = getTensorsInContainer(container);
    expect(results.length).toBe(3);
  });
});

describeWithFlags('convertToTensor', ALL_ENVS, () => {
  it('primitive integer, NaN converts to zero, no error thrown', () => {
    const a = () => convertToTensor(NaN, 'a', 'test', 'int32');
    expect(a).not.toThrowError();

    const b = convertToTensor(NaN, 'b', 'test', 'int32');
    expect(b.rank).toBe(0);
    expect(b.dtype).toBe('int32');
    expectNumbersClose(b.get(), 0);
  });

  it('primitive number', () => {
    const a = convertToTensor(3, 'a', 'test');
    expect(a.rank).toBe(0);
    expect(a.dtype).toBe('float32');
    expectNumbersClose(a.get(), 3);
  });

  it('primitive integer, NaN converts to zero', () => {
    const a = convertToTensor(NaN, 'a', 'test', 'int32');
    expect(a.rank).toBe(0);
    expect(a.dtype).toBe('int32');
    expectNumbersClose(a.get(), 0);
  });

  it('primitive boolean, parsed as float', () => {
    const a = convertToTensor(true, 'a', 'test');
    expect(a.rank).toBe(0);
    expect(a.dtype).toBe('float32');
    expectNumbersClose(a.get(), 1);
  });

  it('primitive boolean, parsed as bool', () => {
    const a = convertToTensor(true, 'a', 'test', 'bool');
    expect(a.rank).toBe(0);
    expect(a.dtype).toBe('bool');
    expect(a.get()).toBe(1);
  });

  it('array1d', () => {
    const a = convertToTensor([1, 2, 3], 'a', 'test');
    expect(a.rank).toBe(1);
    expect(a.dtype).toBe('float32');
    expect(a.shape).toEqual([3]);
    expectArraysClose(a, [1, 2, 3]);
  });

  it('array2d', () => {
    const a = convertToTensor([[1], [2], [3]], 'a', 'test');
    expect(a.rank).toBe(2);
    expect(a.shape).toEqual([3, 1]);
    expect(a.dtype).toBe('float32');
    expectArraysClose(a, [1, 2, 3]);
  });

  it('array3d', () => {
    const a = convertToTensor([[[1], [2]], [[3], [4]]], 'a', 'test');
    expect(a.rank).toBe(3);
    expect(a.shape).toEqual([2, 2, 1]);
    expect(a.dtype).toBe('float32');
    expectArraysClose(a, [1, 2, 3, 4]);
  });

  it('array4d', () => {
    const a = convertToTensor([[[[1]], [[2]]], [[[3]], [[4]]]], 'a', 'test');
    expect(a.rank).toBe(4);
    expect(a.shape).toEqual([2, 2, 1, 1]);
    expect(a.dtype).toBe('float32');
    expectArraysClose(a, [1, 2, 3, 4]);
  });

  it('passing a tensor returns the tensor itself', () => {
    const s = tf.scalar(3);
    const res = convertToTensor(s, 'a', 'test');
    expect(res).toBe(s);
  });

  it('passing a tensor with casting returns the tensor itself', () => {
    const s = tf.scalar(3);
    const res = convertToTensor(s, 'a', 'test', 'bool');
    expect(res).toBe(s);
  });

  it('fails to convert a dict to tensor', () => {
    // tslint:disable-next-line:no-any
    expect(() => convertToTensor({} as any, 'a', 'test'))
        .toThrowError(
            'Argument \'a\' passed to \'test\' must be a Tensor ' +
            'or TensorLike, but got Object');
  });

  it('fails to convert a string to tensor', () => {
    // tslint:disable-next-line:no-any
    expect(() => convertToTensor('asdf' as any, 'a', 'test'))
        .toThrowError(
            'Argument \'a\' passed to \'test\' must be a Tensor ' +
            'or TensorLike, but got String');
  });

  it('fails to convert a non-valid shape array to tensor', () => {
    const a = [[1, 2], [3], [4, 5, 6]];  // 2nd element has only 1 entry.
    expect(() => convertToTensor(a, 'a', 'test'))
        .toThrowError(
            'Element arr[1] should have 2 elements, but has 1 elements');
  });
});
