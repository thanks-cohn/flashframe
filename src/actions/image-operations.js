export const IMAGE_FORMATS = Object.freeze({ png: "image/png", jpeg: "image/jpeg", webp: "image/webp" });

export function outputDimensions(width, height, requestedWidth, requestedHeight, lockAspect = true) {
  let w = Math.max(1, Math.round(Number(requestedWidth) || width));
  let h = Math.max(1, Math.round(Number(requestedHeight) || height));
  if (lockAspect) h = Math.max(1, Math.round(w * height / width));
  return { width: w, height: h };
}

export function alphaBounds(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3]) {
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return right < left ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export async function imageElementToBlob(image, options = {}) {
  const sourceWidth = image.naturalWidth || image.videoWidth || image.width;
  const sourceHeight = image.naturalHeight || image.videoHeight || image.height;
  const crop = options.crop || { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  const dimensions = outputDimensions(crop.width, crop.height, options.width || crop.width, options.height || crop.height, options.lockAspect !== false);
  const quarterTurns = ((Number(options.rotate) || 0) / 90 % 4 + 4) % 4;
  const canvas = document.createElement("canvas");
  canvas.width = quarterTurns % 2 ? dimensions.height : dimensions.width;
  canvas.height = quarterTurns % 2 ? dimensions.width : dimensions.height;
  const context = canvas.getContext("2d", { alpha: true });
  if (options.background) { context.fillStyle = options.background; context.fillRect(0, 0, canvas.width, canvas.height); }
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(quarterTurns * Math.PI / 2 + (Number(options.straighten) || 0) * Math.PI / 180);
  context.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, -dimensions.width / 2, -dimensions.height / 2, dimensions.width, dimensions.height);
  context.setTransform(1,0,0,1,0,0);
  if(options.perspective){
    const source=document.createElement("canvas");source.width=canvas.width;source.height=canvas.height;source.getContext("2d").drawImage(canvas,0,0);context.clearRect(0,0,canvas.width,canvas.height);
    const p=options.perspective.map(([x,y])=>[x*canvas.width,y*canvas.height]);
    const triangles=[[[[0,0],[canvas.width,0],[0,canvas.height]],[p[0],p[1],p[3]]],[[[canvas.width,0],[canvas.width,canvas.height],[0,canvas.height]],[p[1],p[2],p[3]]]];
    for(const [from,to]of triangles){const [s0,s1,s2]=from,[d0,d1,d2]=to,den=s0[0]*(s1[1]-s2[1])+s1[0]*(s2[1]-s0[1])+s2[0]*(s0[1]-s1[1]),coef=(values)=>[(values[0]*(s1[1]-s2[1])+values[1]*(s2[1]-s0[1])+values[2]*(s0[1]-s1[1]))/den,(values[0]*(s2[0]-s1[0])+values[1]*(s0[0]-s2[0])+values[2]*(s1[0]-s0[0]))/den,(values[0]*(s1[0]*s2[1]-s2[0]*s1[1])+values[1]*(s2[0]*s0[1]-s0[0]*s2[1])+values[2]*(s0[0]*s1[1]-s1[0]*s0[1]))/den],cx=coef(to.map(v=>v[0])),cy=coef(to.map(v=>v[1]));context.save();context.beginPath();context.moveTo(...d0);context.lineTo(...d1);context.lineTo(...d2);context.closePath();context.clip();context.setTransform(cx[0],cy[0],cx[1],cy[1],cx[2],cy[2]);context.drawImage(source,0,0);context.restore();}
  }
  if (options.transparentColor) {
    const color=options.transparentColor.replace("#","");const target=[0,2,4].map(at=>parseInt(color.slice(at,at+2),16)),tolerance=Number(options.tolerance)||30,data=context.getImageData(0,0,canvas.width,canvas.height);
    for(let at=0;at<data.data.length;at+=4)if(Math.hypot(data.data[at]-target[0],data.data[at+1]-target[1],data.data[at+2]-target[2])<=tolerance)data.data[at+3]=0;context.putImageData(data,0,0);
  }
  for (const region of options.regions || []) {
    const x=region.x*canvas.width,y=region.y*canvas.height,w=region.width*canvas.width,h=region.height*canvas.height;
    if(region.effect==="pixelate"){const scale=Math.max(1,Math.round(Math.min(w,h)/18)),temp=document.createElement("canvas");temp.width=Math.max(1,Math.round(w/scale));temp.height=Math.max(1,Math.round(h/scale));temp.getContext("2d").drawImage(canvas,x,y,w,h,0,0,temp.width,temp.height);context.imageSmoothingEnabled=false;context.drawImage(temp,0,0,temp.width,temp.height,x,y,w,h);context.imageSmoothingEnabled=true;}
    else {context.save();context.filter=`blur(${region.radius||10}px)`;context.drawImage(canvas,x,y,w,h,x,y,w,h);context.restore();}
  }
  for(const annotation of options.annotations||[]){context.save();context.strokeStyle=annotation.color||"#ff0000";context.fillStyle=annotation.color||"#ff0000";context.lineWidth=annotation.width||4;if(annotation.type==="text"){context.font=`${annotation.size||28}px sans-serif`;context.fillText(annotation.text,annotation.x*canvas.width,annotation.y*canvas.height);}else if(annotation.type==="arrow"||annotation.type==="line"){const x=annotation.x*canvas.width,y=annotation.y*canvas.height,endX=annotation.endX*canvas.width,endY=annotation.endY*canvas.height,angle=Math.atan2(endY-y,endX-x),head=14;context.beginPath();context.moveTo(x,y);context.lineTo(endX,endY);if(annotation.type==="arrow"){context.lineTo(endX-head*Math.cos(angle-Math.PI/6),endY-head*Math.sin(angle-Math.PI/6));context.moveTo(endX,endY);context.lineTo(endX-head*Math.cos(angle+Math.PI/6),endY-head*Math.sin(angle+Math.PI/6));}context.stroke();}else context.strokeRect(annotation.x*canvas.width,annotation.y*canvas.height,annotation.width*canvas.width,annotation.height*canvas.height);context.restore();}
  const type = IMAGE_FORMATS[options.format] || options.type || "image/png";
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`${type} encoding is unavailable`)), type, options.quality ?? .86));
}
