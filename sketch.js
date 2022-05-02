const DaysEachMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DaysAYear = 365.25;

const MonthTickSize = 25;
const MonthTickWeight = 3;

const DataLineWeight = 0.1;
let DataLineColor;

const SunWeight = 10;
let SunColor;

const ResultLineWeight = 2;
let ResultLineColor;

let csvFile = null;

window.addEventListener("load", function (_) {
  document.getElementById("submit").addEventListener("click", async function (_){
    csvFile = document.getElementById("CSV Input");
  });
});

function preload(){
  csvFile = loadStrings("assets/Mercury_Data.csv");
}

function setup(){
  createCanvas(800, 800, SVG);
  SunColor = color(200, 200, 100);
  DataLineColor = color(150, 150, 100);
  ResultLineColor = color(100, 150, 255);
}
function draw(){
  if (csvFile == []){
    return;
  }
  drawDiagram(csvFile);
  noLoop();
}

function drawDiagram(data){
  ellipseMode(RADIUS);
  background(51);
  
  stroke(255);
  strokeWeight(MonthTickWeight);
  for (let i = 0; i < 12; i++){
    let l = p5.Vector.fromAngle(-DateToDays(1, i+1, 0, 0)*TAU/DaysAYear);
    line(width/2 + l.x*(width/3-MonthTickSize/2), height/2 + l.y*(width/3-MonthTickSize/2), width/2 + l.x*(width/3+MonthTickSize/2), height/2 + l.y*(width/3+MonthTickSize/2));
  }
  
  let startYear = Infinity;
  for (let i = 1; i < data.length; i++){
    let y = int(data[i].split(",")[0]);
    if (y < startYear){ startYear = y; }
  }
  
  //for (int i = 1; i < 2; i++){
  for (let i = 1; i < data.length; i++){
    let splitData = data[i].split(",");
    let l = p5.Vector.fromAngle(-DateToDays(int(splitData[2]), int(splitData[1]), int(splitData[0]), startYear)*TAU/DaysAYear);
    
    strokeWeight(DataLineWeight);
    stroke(DataLineColor);
    line(width/2, height/2, width/2 + l.x*width/3, height/2 + l.y*width/3);
    
    stroke(SunColor);
    strokeWeight(SunWeight);
    point(width/2, height/2);
    
    let p1 = createVector(width/2 + l.x*width/3, height/2 + l.y*width/3);
    
    l.rotate(PI);
    if(splitData[4].charAt(0) == 'W'){
      l.rotate( TAU * ( float(splitData[3]) / 360 ) );
    }else{
      l.rotate( TAU * ( 1 - float(splitData[3]) / 360 ) );
    }
    
    strokeWeight(ResultLineWeight);
    stroke(ResultLineColor);
    line(p1.x, p1.y, p1.x + l.x * width * 2, p1.y + l.y * height * 2);
    
    print("Slope: m = ", -l.y/l.x);
  }

  stroke(255);
  strokeWeight(5);
  noFill();
  ellipse(width/2, height/2, width/3, width/3);
}

function DateToDays(d, m, y, start){
  days = d-1;
  for (let i = 0; i < m-1; i++){
    days += DaysEachMonth[i];
  }
  days += floor((y + int(days >= DaysEachMonth[0] + DaysEachMonth[1]-1))/4)-floor(start/4);
  return days;
}