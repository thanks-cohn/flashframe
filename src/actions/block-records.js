export function duplicateBlockRecord(record, { id, offset = 28, z } = {}) {
  if (!record || !id) throw new TypeError("Duplicating a block requires a captured record and new id");
  const copy=structuredClone(record);copy.id=id;copy.name=`${copy.name} copy`;copy.geometry={...copy.geometry,x:(copy.geometry.x||0)+offset,y:(copy.geometry.y||0)+offset,...(z==null?{}:{z})};return copy;
}
export function captureCsvState(rows) { return { rows: structuredClone(rows) }; }
export function restoreCsvState(state) { return structuredClone(state?.rows || []); }
