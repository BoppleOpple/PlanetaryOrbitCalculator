const DaysEachMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DaysAYear = 365.25;

const MonthTickSize = 25;
const MonthTickWeight = 3;

const DataLineWeight = 0.1;
let DataLineColor;

const SunWeight = 10;
let SunPos, SunColor;

const ResultLineWeight = 2;
let ResultLineColor;

let csvFile = null;
let calculated = false;

let renderingCache = [];

window.addEventListener("load", function (_) {
  document.getElementById("submit").addEventListener("click", async function (_) {
    // csvFile = document.getElementById("CSV Input");

    calculated = false;
    renderingCache = [];

    loop();
  });
});

function preload() {
  csvFile = loadStrings("assets/Mercury_Data.csv");
}

function setup() {
  createCanvas(800, 800, SVG);
  SunColor = color(200, 200, 100);
  DataLineColor = color(150, 150, 100);
  ResultLineColor = color(100, 150, 255);

  SunPos = createVector(width / 2, height / 2);
  let renderingOptions = document.getElementsByClassName("renderToggle");
  for (let i in renderingOptions) {
    if (typeof renderingOptions[i] == "object") renderingOptions[i].addEventListener("click", _ => loop());
  }
}

function draw() {
  if (!calculated) {
    if (csvFile == []) {
      return;
    }
    drawDiagram(csvFile); //.slice(0, 6));
    noLoop();

    renderingCache.sort((a, b) => b.order - a.order)
  }

  background(51);

  for (let item of renderingCache) {
    let option = document.getElementById(item.renderItem);
    if (!option) {
      console.error("Unrecognised option: " + item.renderItem);
      continue;
    }

    if (!option.checked) continue;

    let dataType = option.getAttribute("datatype");
    let renderItem = option.getAttribute("id");
    let array = false;

    if (dataType.endsWith('[]')) {
      array = true;
      dataType = dataType.slice(0, -2);
    }

    eval(item.options);

    let data = (array) ? [...item.data] : [item.data];

    switch (dataType) {
      case "ellipse": // [x, y, rotation, a, b]
        for (let ele of data) {
          push();
          translate(ele[0], ele[1]);
          rotate(ele[2]);
          ellipse(0, 0, ele[3], ele[4]);
          pop();
        }
        break;
      case "point": // [x, y]
        for (let ele of data) point(ele[0], ele[1]);
        break;
      case "line": // [x1, y1, x2, y2]
        for (let ele of data) line(ele[0], ele[1], ele[2], ele[3]);
        break;
      case "arc": // [x, y, rotation, a, b, startAngle, stopAngle]
        for (let ele of data) {
          push();
          translate(ele[0], ele[1]);
          rotate(ele[2]);
          arc(0, 0, ele[3], ele[4], ele[5], ele[6]);
          pop();
        }
        break;
      default:
        console.error("Unknown datatype: " + dataType);
        break;
    }
  }

  noLoop();
}

function drawDiagram(data) {
  renderingCache.push({
    renderItem: "YearCircle",
    options: "ellipseMode(RADIUS); strokeWeight(5); stroke(255); noFill();",
    data: [width / 2, height / 2, 0, width / 3, width / 3],
    order: 0
  });

  renderingCache.push({
    renderItem: "MonthLines",
    options: "stroke(255); strokeWeight(MonthTickWeight);",
    data: (() => {
      let result = [];
      for (let i = 0; i < 12; i++) {
        let l = p5.Vector.fromAngle(-DateToDays(1, i + 1, 0, 0) * TAU / DaysAYear);
        result.push([SunPos.x + l.x * (width / 3 - MonthTickSize / 2), SunPos.y + l.y * (width / 3 - MonthTickSize / 2), SunPos.x + l.x * (width / 3 + MonthTickSize / 2), SunPos.y + l.y * (width / 3 + MonthTickSize / 2)]);
      }
      return result;
    })(),
    order: 0
  });

  renderingCache.push({
    renderItem: "Sun",
    options: "strokeWeight(SunWeight); stroke(SunColor);",
    data: [SunPos.x, SunPos.y],
    order: 0
  });

  let startYear = Infinity;
  for (let i = 1; i < data.length; i++) {
    let y = int(data[i].split(",")[0]);
    if (y < startYear) {
      startYear = y;
    }
  }

  let tangents = [];

  let cachePosition = renderingCache.length;
  renderingCache.push({
    renderItem: "SunEarth",
    options: "strokeWeight(DataLineWeight); stroke(DataLineColor);",
    data: [],
    order: 6
  });
  renderingCache.push({
    renderItem: "Earth",
    options: "strokeWeight(15); stroke(100, 200, 100);",
    data: [],
    order: -1
  });
  renderingCache.push({
    renderItem: "Tangents",
    options: "strokeWeight(ResultLineWeight); stroke(ResultLineColor);",
    data: [],
    order: 2
  });
  for (let i = 1; i < data.length; i++) {
    let splitData = data[i].split(",");
    let l = p5.Vector.fromAngle(-DateToDays(int(splitData[2]), int(splitData[1]), int(splitData[0]), startYear) * TAU / DaysAYear);

    renderingCache[cachePosition].data.push([SunPos.x, SunPos.y, SunPos.x + l.x * width / 3, SunPos.y + l.y * width / 3]);

    let p1 = createVector(SunPos.x + l.x * width / 3, SunPos.y + l.y * width / 3);

    renderingCache[cachePosition + 1].data.push([p1.x, p1.y]);

    l.rotate(PI);
    if (splitData[4].charAt(0) == 'W') {
      l.rotate(TAU * (float(splitData[3]) / 360));
    } else {
      l.rotate(TAU * (1 - float(splitData[3]) / 360));
    }


    renderingCache[cachePosition + 2].data.push([p1.x, p1.y, p1.x + l.x * width * 2, p1.y + l.y * height * 2]);
    tangents.push([p1, p5.Vector.add(p1, l)]);
  }

  let [finalFocus, [, ...intersections], midpoints] = conicFromPolygon(tangents);
  renderingCache.push({
    renderItem: "Focus",
    options: "strokeWeight(10); stroke(255);",
    data: [finalFocus.x, finalFocus.y],
    order: 0
  });

  let center = p5.Vector.add(SunPos, p5.Vector.div(p5.Vector.sub(finalFocus, SunPos), 2));

  let minor = [];
  let minorDirection = p5.Vector.add(center, p5.Vector.fromAngle(p5.Vector.sub(finalFocus, SunPos).heading() + PI / 2))
  for (let t in tangents) {
    minor.push(intersect(tangents[t], [center, minorDirection]));
  }


  minor = minor.sort((p1, p2) => center.dist(p1) - center.dist(p2)).slice(0, 2);

  renderingCache.push({
    renderItem: "Minor",
    options: "strokeWeight(2); stroke(200, 100, 200);",
    data: [minor[0].x, minor[0].y, minor[1].x, minor[1].y],
    order: 3
  });

  let major = [];
  for (let t in tangents) {
    major.push(intersect(tangents[t], [finalFocus, SunPos]));
  }

  major = [major.sort((p1, p2) => SunPos.dist(p1) - SunPos.dist(p2))[0],
    major.sort((p1, p2) => finalFocus.dist(p1) - finalFocus.dist(p2))[0]
  ]

  renderingCache.push({
    renderItem: "Major",
    options: "strokeWeight(2); stroke(200, 100, 200);",
    data: [major[0].x, major[0].y, major[1].x, major[1].y],
    order: 3
  });

  renderingCache.push({
    renderItem: "Center",
    options: "strokeWeight(2); stroke(0);",
    data: [center.x, center.y],
    order: 2
  });

  renderingCache.push({
    renderItem: "Orbit",
    options: "ellipseMode(RADIUS); strokeWeight(1); stroke(255); noFill();",
    data: [center.x, center.y, p5.Vector.sub(...major).heading(), major[0].dist(major[1]) / 2, minor[0].dist(minor[1]) / 2],
    order: 1
  });

  let A = (major[0].dist(major[1]) / (width / 3)) / 2;
  let B = (minor[0].dist(minor[1]) / (width / 3)) / 2;
  let E = Math.sqrt(A * A - B * B) / A;
  console.log('a:', A, "Relative Error:", 100 * Math.abs(A - .387) / .387, '%');
  console.log('b:', B, "Relative Error:", 100 * Math.abs(B - .379) / .379, '%');
  console.log('e:', E, "Relative Error:", 100 * Math.abs(E - .206) / .206, '%');


  // let midpoint1 = midpoints.find(midp => midp[0] == tangents[0]);
  // let midpoint2 = midpoints.find(midp => midp[1] == tangents[1]);

  // console.log(sweepArea(A, B, midpoint2.heading()-majorDirection.heading())-sweepArea(A, B, midpoint1.heading()-majorDirection.heading()), )
  let maxDiff = 0;
  let index1 = 0;
  let index2 = 1;
  for (let i = 0; i < midpoints.length - 1; i++) {
    let midpoint1 = midpoints[i];
    let lastDiff = 0;
    for (let j = i + 1; j % midpoints.length != i; j++) {
      let midpoint2 = midpoints[j % midpoints.length];
      let difference = midpoint1[0].dist(midpoint2[0]);
      if (difference < lastDiff) {
        if (maxDiff < difference) {
          maxDiff = difference;
          index1 = i;
          index2 = j % midpoints.length - 1;
        }
        break;
      }
      lastDiff = difference;
    }
  }
  let [...date1] = data[tangents.indexOf(midpoints[index1][1]) + 1].split(',');
  let [...date2] = data[tangents.indexOf(midpoints[index2][1]) + 1].split(',');
  let orbitalPeriod = 2 * abs(DateToDays(int(date1[2]), int(date1[1]), int(date1[0]), startYear) - DateToDays(int(date2[2]), int(date2[1]), int(date2[0]), startYear));
  console.log(date1, date2)
  renderingCache.push({
    renderItem: "LongestConsecutive",
    options: "strokeWeight(8); stroke(150, 255, 100);",
    data: [
      [midpoints[index1][0].x, midpoints[index1][0].y],
      [midpoints[(index2) % midpoints.length][0].x, midpoints[index2][0].y]
    ],
    order: -2
  });

  console.log(midpoints[index1], midpoints[index2]);

  let angles = [
    p5.Vector.sub(midpoints[index1][0], center).heading() - p5.Vector.sub(...major).heading(),
    p5.Vector.sub(midpoints[index2][0], center).heading() - p5.Vector.sub(...major).heading(),
  ]

  renderingCache.push({
    renderItem: "HalfYear",
    options: "ellipseMode(RADIUS); strokeWeight(5); stroke(150, 255, 100); noFill();",
    data: [center.x, center.y, p5.Vector.sub(...major).heading(), A * width / 3, B * width / 3, angles[0], angles[1]],
    order: -1
  });

  document.getElementById('a').innerText = A.toString() + " AU";
  document.getElementById('b').innerText = B.toString() + " AU";
  document.getElementById('e').innerText = E.toString();
  document.getElementById("period").innerText = orbitalPeriod.toString() + " days";

  calculated = true;
}

function sweepArea(a, b, theta) {
  let quarters = floor(theta / (PI / 2));

  let area = quarters * (PI * a * b) / 4;

  theta -= quarters * PI / 2;

  area += theta * (a * a + b * b) + b * (a * atan((sin(theta) * sqrt(a * a - b * b)) / b) - (2 * b * sin(theta) * ((b * b - a * a) * cos(theta) + a * sqrt((a - b) * (a + b))) + a * ((b * b - a * a) * cos(2 * theta) + a * a + b * b) * atan(a * tan(theta) / b)) / ((b * b - a * a) * cos(2 * theta) + a * a + b * b));

  console.log(area);
  return area;
}

function DateToDays(d, m, y, start) {
  days = d - 1;
  for (let i = 0; i < m - 1; i++) {
    days += DaysEachMonth[i];
  }
  days += floor((y + int(days >= DaysEachMonth[0] + DaysEachMonth[1] - 1)) / 4) - floor(start / 4);
  return days;
}

function ncr(a, b) {
  let binStr = "".padStart(b, '1').padEnd(a, '0');
  let combos = [];
  let maxCombos = Math.round(factorial(a, b + 1) / factorial(a - b));
  // console.log(a, b, maxCombos)

  while (combos.length <= maxCombos) {
    combos.push(binStr);
    if (binStr.slice(a - b, a).includes('0')) {
      if (binStr[a - 1] == '1') {
        let n = a - binStr.lastIndexOf('0') - 1;
        for (let i = a - n - 1; i < a; i++) {
          binStr = replIndex(binStr, i, '0');
        }
        let nextDigit = binStr.lastIndexOf('1');
        binStr = replIndex(binStr, nextDigit, '0');
        for (let i = 1; i <= n + 1; i++) {
          if (nextDigit + i < binStr.length) {
            binStr = replIndex(binStr, nextDigit + i, '1');
          } else {
            binStr += '1'
          }
        }
        binStr = binStr.padEnd(a, '0');
      } else {
        let nextDigit = binStr.lastIndexOf('1');
        binStr = replIndex(binStr, nextDigit, '0');
        binStr = replIndex(binStr, nextDigit + 1, '1');
      }
    } else {
      return combos;
    }
  }
}

function intersect(l1, l2) { // Lines: [Point Vector, Point Vector]
  // ax + c = bx + d
  let a = (l1[1].y - l1[0].y) / (l1[1].x - l1[0].x);
  let c = l1[0].y - a * l1[0].x
  let b = (l2[1].y - l2[0].y) / (l2[1].x - l2[0].x);
  let d = l2[0].y - b * l2[0].x;

  return createVector((d - c) / (a - b), a * (d - c) / (a - b) + c);
}

function replIndex(a, i, binStr) {
  let b = a.split('');
  b[i] = binStr;
  return b.join('');
}

function factorial(n, thresh = 1) {
  return (n <= thresh) ? thresh : n * factorial(n - 1, thresh);
}

function contains(p, corners) {
  return [...corners].sort((v1, v2) => (v1.x - v2.x))[0].x <= p.x && p.x <= [...corners].sort((v1, v2) => (v2.x - v1.x))[0].x && [...corners].sort((v1, v2) => (v1.y - v2.y))[0].y <= p.y && p.y <= [...corners].sort((v1, v2) => (v2.y - v1.y))[0].y;
}

function reflect(l1, l2) {
  let reflectPoint = intersect(l1, l2);
  let direction = p5.Vector.fromAngle(p5.Vector.sub(l2[1], l2[0]).heading() - (p5.Vector.sub(l1[1], l1[0]).heading() - p5.Vector.sub(l2[1], l2[0]).heading()));
  return [reflectPoint, p5.Vector.add(reflectPoint, direction)];
}

function conicFromPolygon(tangents) {

  intersections = [];
  for (let i = 0; i < tangents.length; i++) {
    for (let j = 0; j < i; j++) {
      intersections.push([intersect(tangents[i], tangents[j]), i, j])
      // point(intersections[intersections.length-1][0]);
    }
  }

  intersections = intersections.filter(i1 => {
    for (let j in tangents) {
      if (j == i1[1] || j == i1[2]) {
        continue;
      } else {
        let i2 = intersect([i1[0], SunPos], tangents[j]);
        if (contains(i2, [SunPos, i1[0]])) {
          return false;
        }
      }
    }
    return true;
  });

  intersections.sort((i1, i2) => {
    return p5.Vector.sub(SunPos, i1[0]).heading() - p5.Vector.sub(SunPos, i2[0]).heading();
  });

  let cachePosition = renderingCache.length;


  renderingCache.push({
    renderItem: "Polygon",
    options: "strokeWeight(3); stroke(255, 150, 100);",
    data: [],
    order: -1
  });

  renderingCache.push({
    renderItem: "Midpoints",
    options: "strokeWeight(5); stroke(100, 200, 100);",
    data: [],
    order: -2
  });

  renderingCache.push({
    renderItem: "Reflections",
    options: "strokeWeight(2); stroke(255, 100, 100);",
    data: [],
    order: 1
  });


  let midpoints = [];
  let focusLines = [];
  let potentialFoci = [];
  for (let i in intersections) {
    i = parseInt(i);
    let intersection = intersections[i];
    let intersection2 = intersections[(i + 1) % intersections.length];
    renderingCache[cachePosition].data.push([intersection[0].x, intersection[0].y, intersection2[0].x, intersection2[0].y]);

    let index = (intersection[1] == intersection2[1] || intersection[1] == intersection2[2]) ? 1 : (intersection[2] == intersection2[1] || intersection[2] == intersection2[2]) ? 2 : null;

    let tanLine = tangents[intersection[index]];

    midpoints.push([p5.Vector.add(intersection2[0], p5.Vector.div(p5.Vector.sub(intersection[0], intersection2[0]), 2)), tanLine])

    renderingCache[cachePosition + 1].data.push([midpoints[midpoints.length - 1][0].x, midpoints[midpoints.length - 1][0].y])

    focusLines.push(reflect([SunPos, midpoints[midpoints.length - 1][0]], midpoints[midpoints.length - 1][1]));



    focusLines[focusLines.length - 1][1] = p5.Vector.add(focusLines[focusLines.length - 1][0], p5.Vector.mult(p5.Vector.sub(focusLines[focusLines.length - 1][1], focusLines[focusLines.length - 1][0]), width))
    renderingCache[cachePosition + 2].data.push(...[
      [SunPos.x, SunPos.y, focusLines[focusLines.length - 1][0].x, focusLines[focusLines.length - 1][0].y],
      [focusLines[focusLines.length - 1][0].x, focusLines[focusLines.length - 1][0].y, focusLines[focusLines.length - 1][1].x, focusLines[focusLines.length - 1][1].y]
    ])
    for (let j = 0; j < focusLines.length - 1; j++) {
      potentialFoci.push(intersect(focusLines[focusLines.length - 1], focusLines[j]));
    }
  }

  // let foci = [...potentialFoci];

  let foci = potentialFoci.filter(f1 => {
    for (let j in tangents) {
      if (j == f1[1] || j == f1[2]) {
        continue;
      } else {
        let f2 = intersect([f1, SunPos], tangents[j]);
        if (contains(f2, [SunPos, f1])) {
          return false;
        }
      }
    }
    return true;
  });

  // test the error for each focus

  cachePosition = renderingCache.length;
  renderingCache.push({
    renderItem: "Foci",
    options: "strokeWeight(4); stroke(100, 200, 200, 50);",
    data: [],
    order: -1
  });

  let finalFocus = createVector();
  let bestError = Infinity;
  for (let focus of foci) {
    renderingCache[cachePosition].data.push([focus.x, focus.y])
    let error = 0;
    for (let focus2 of foci) {
      error += focus.dist(focus2);
      if (error > bestError) {
        break;
      }
    }
    if (error < bestError) {
      bestError = error;
      finalFocus.set(focus);
    }
  }
  return [finalFocus, intersections, midpoints];
}

function searchBox(_) {
  // in functions called by elements, that element is used as the caller, so no need for IDs
  let filter = this.value.toUpperCase();
  let listElements = this.parentNode.getElementsByTagName("li");
  for (let li of listElements) {
    let listElementLabel = li.getElementsByTagName("label")[0];
    let txtValue = listElementLabel.textContent || listElementLabel.innerText;
    if (txtValue.toUpperCase().includes(filter)) {
      console.log(txtValue, filter)
      if (li.class == "checkListElement") {
        li.parentNode.parentNode.style.display = "";
      }
      li.style.display = "";
    } else {
      li.style.display = "none";
    }
  }
}
window.addEventListener("load", e => {
  for (let input of document.getElementsByClassName("searchbar")) {
    input.addEventListener("keyup", searchBox);
  }
});