export type Camera={zoom:number;x:number;y:number};
export const initialCamera:Camera={zoom:1,x:0,y:0};
export function clampCamera(c:Camera):Camera{const zoom=Math.max(1,Math.min(12,c.zoom));return {zoom,x:Math.max(-500*(zoom-1),Math.min(500*(zoom-1),c.x))||0,y:Math.max(-255*(zoom-1),Math.min(255*(zoom-1),c.y))||0};}
export function zoomAt(c:Camera,zoom:number,px:number,py:number){const z=Math.max(1,Math.min(12,zoom)),r=z/c.zoom;return clampCamera({zoom:z,x:px-500-(px-500-c.x)*r,y:py-255-(py-255-c.y)*r});}
export function focusAt(lon:number,lat:number):Camera{const zoom=3;return clampCamera({zoom,x:(500-(lon+180)*1000/360)*zoom,y:(255-(90-lat)*510/180)*zoom});}
