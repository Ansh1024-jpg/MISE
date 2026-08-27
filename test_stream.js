const buffer = `data: {"text":"a"}\n\ndata: {"text":"b"}\n\ndata: {"text":"c"}\n\n`;
const lines = buffer.split('\n\n');
console.log("Lines length:", lines.length);
console.log(lines);
