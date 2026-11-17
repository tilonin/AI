import {test} from 'node:test';import assert from 'node:assert/strict';import {initialCamera,zoomAt,clampCamera,focusAt} from './camera';
test('zoom is clamped and anchored at cursor',()=>{const c=zoomAt(initialCamera,2,600,300);assert.equal(c.x,-100);assert.equal(c.y,-45);assert.equal(zoomAt(c,100,500,255).zoom,12);assert.deepEqual(zoomAt(c,0,500,255),initialCamera);});
test('camera boundaries prevent losing map',()=>{assert.deepEqual(clampCamera({zoom:2,x:99999,y:-99999}),{zoom:2,x:500,y:-255});assert.equal(focusAt(10,50).zoom,3);});
