# `nvds`

"npm version download stats" is an utility to fetch npm stats form the "Versions" tab.

```js
import getStats from 'nvds';

const stats = await getStats('express');

console.log(stats.length, stats.slice(0, 3));
/*
214 [
  { version: '5.0.0-alpha.8', downloads: 12150, time: 2020-03-26T00:57:02.755Z, tags: [ 'next' ] ,
  { version: '4.17.1', downloads: 17166, time: 2019-05-26T04:25:34.606Z, tags: [ 'latest' ] ,
  { version: '4.17.0', downloads: 26010, time: 2019-05-17T01:57:40.690Z, tags: [] ,
  { version: '5.0.0-alpha.7', downloads: 1297, time: 2018-10-27T03:12:11.060Z, tags: [] ,
  { version: '4.16.4', downloads: 749528, time: 2018-10-11T03:59:14.308Z, tags: [] }
]
*/
```
