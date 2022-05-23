const DaysEachMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // Array to reference the number of days in each  month
const DaysAYear = 365.25;

let SunPos;

let csvFile = null;
let calculated = false; // Flag to signal when to re-render vs. when to recalculate

let renderingCache = []; // Array to store the instructions for drawing lines, points, etc. without recalculating the ellipse

window.addEventListener("load", function (_) {
  document.getElementById("submit").addEventListener("click", async function (_) {
    calculated = false;
    renderingCache = [];

    loop();
  });
});

function preload() {
  csvFile = loadStrings("assets/Mercury_Data.csv"); // load the data (could use fetch, but p5.js  has a feature for it)
}

function setup() {
  createCanvas(800, 800, SVG);

  SunPos = createVector(width / 2, height / 2);
  let renderingOptions = document.getElementsByClassName("renderToggle"); // reading the HTML to see how many fields 
  for (let i in renderingOptions) {
    if (typeof renderingOptions[i] == "object") renderingOptions[i].addEventListener("click", _ => loop());
  }
  processThirdLawData("assets/3rdLawData.csv"); // do the entire bottom section bassed off the data in this csv
}

function draw() {
  if (!calculated) {
    if (csvFile == []) {
      return;
    }
    drawDiagram(csvFile);
    noLoop();

    renderingCache.sort((a, b) => b.order - a.order) // render some thing on top of others
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
    let array = false;

    if (dataType.endsWith('[]')) {
      array = true;
      dataType = dataType.slice(0, -2);
    }

    eval(item.options);

    let data = (array) ? [...item.data] : [item.data]; // if it isn't an array, make it an array

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
    options: "stroke(255); strokeWeight(3);",
    data: (() => {
      let result = [];
      for (let i = 0; i < 12; i++) {
        let l = p5.Vector.fromAngle(-DateToDays(1, i + 1, 0, 0) * TAU / DaysAYear);
        result.push([SunPos.x + l.x * (width / 3 - 25 / 2), SunPos.y + l.y * (width / 3 - 25 / 2), SunPos.x + l.x * (width / 3 + 25 / 2), SunPos.y + l.y * (width / 3 + 25 / 2)]);
      } // drawing lines for each month
      return result;
    })(),
    order: 0
  });

  renderingCache.push({
    renderItem: "Sun",
    options: "strokeWeight(10); stroke(200, 200, 100);",
    data: [SunPos.x, SunPos.y],
    order: 0
  });

  // find the earliest date

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
    options: "strokeWeight(.25); stroke(150, 150, 100);",
    data: [], // dummy arrays to push data to later
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
    options: "strokeWeight(2); stroke(100, 150, 255);",
    data: [],
    order: 2
  });
  for (let i = 1; i < data.length; i++) {
    let splitData = data[i].split(","); // Format CSV as a matrix

    let l = p5.Vector.fromAngle(-DateToDays(int(splitData[2]), int(splitData[1]), int(splitData[0]), startYear) * TAU / DaysAYear); // Create a vector pointing in the direction of the earth (based on the date)

    renderingCache[cachePosition].data.push([SunPos.x, SunPos.y, SunPos.x + l.x * width / 3, SunPos.y + l.y * width / 3]); // Draw the line from the sun to the earth

    let p1 = createVector(SunPos.x + l.x * width / 3, SunPos.y + l.y * width / 3); // Position of Earth

    renderingCache[cachePosition + 1].data.push([p1.x, p1.y]); // Draw Earth

    l.rotate(PI);
    if (splitData[4].charAt(0) == 'W') { // if West
      l.rotate(TAU * (float(splitData[3]) / 360)); // rotate by the angle in the data (in radians)
    } else { // if East
      l.rotate(TAU * (1 - float(splitData[3]) / 360)); // rotate backwards by the angle in the data (in radians)
    }

    renderingCache[cachePosition + 2].data.push([p1.x, p1.y, p1.x + l.x * width * 2, p1.y + l.y * height * 2]); // Draw the tangent line...

    tangents.push([p1, p5.Vector.add(p1, l)]); // ...and save it for later
  }

  let [finalFocus, [, ...intersections], midpoints] = conicFromPolygon(tangents); // Intersections is unused, but I passed it anyway just in case
  renderingCache.push({
    renderItem: "Focus",
    options: "strokeWeight(10); stroke(255);",
    data: [finalFocus.x, finalFocus.y], // Point at the "real" second focus (probably very wrong)
    order: 0
  });

  let center = p5.Vector.add(SunPos, p5.Vector.div(p5.Vector.sub(finalFocus, SunPos), 2)); // Center between foci

  let minor = [];
  let minorDirection = p5.Vector.add(center, p5.Vector.fromAngle(p5.Vector.sub(finalFocus, SunPos).heading() + PI / 2)) // Construct a vector perpendicular to the major axis
  for (let t in tangents) {
    minor.push(intersect(tangents[t], [center, minorDirection])); // find where the minor axis intersects the polygon lines
  }


  minor = minor.sort((p1, p2) => center.dist(p1) - center.dist(p2)).slice(0, 2); // pick the 2 closest points

  // do the same for major
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

  // draw stuff

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

  // define the ellipse with standard variables

  let A = (major[0].dist(major[1]) / (width / 3)) / 2;
  let B = (minor[0].dist(minor[1]) / (width / 3)) / 2;
  let E = sqrt(A * A - B * B) / A;

  // find the points closest to the ends of the major axis
  let maxDiff = 0;
  let index1 = 0;
  let index2 = 1;
  for (let i = 0; i < midpoints.length - 1; i++) {
    let midpoint1 = midpoints[i];
    let lastDiff = 0;
    for (let j = i + 1; j % midpoints.length != i; j++) {
      let midpoint2 = midpoints[j % midpoints.length];
      let difference = midpoint1[0].dist(midpoint2[0]);
      if (difference < lastDiff) { // largest difference within a Mercurian year
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
  // Pull from the csv to find dates
  let [...date1] = data[tangents.indexOf(midpoints[index1][1]) + 1].split(',');
  let [...date2] = data[tangents.indexOf(midpoints[index2][1]) + 1].split(',');
  let orbitalPeriod = 2 * abs(DateToDays(int(date1[2]), int(date1[1]), int(date1[0]), startYear) - DateToDays(int(date2[2]), int(date2[1]), int(date2[0]), startYear)); // difference (in days) between the dates
  renderingCache.push({
    renderItem: "LongestConsecutive",
    options: "strokeWeight(8); stroke(150, 255, 100);",
    data: [
      [midpoints[index1][0].x, midpoints[index1][0].y],
      [midpoints[(index2) % midpoints.length][0].x, midpoints[index2][0].y]
    ],
    order: -2
  }); // draw the position of mercury on those two dates

  console.log(midpoints[index1], midpoints[index2]);

  let angles = [ // The angles (relative to the center) of the angles, with the major axis at 𝜃 = 0°
    p5.Vector.sub(midpoints[index1][0], center).heading() - p5.Vector.sub(...major).heading(),
    p5.Vector.sub(midpoints[index2][0], center).heading() - p5.Vector.sub(...major).heading()
  ]

  renderingCache.push({ // draw the arc based on the angles
    renderItem: "HalfYear",
    options: "ellipseMode(RADIUS); strokeWeight(5); stroke(150, 255, 100); noFill();",
    data: [center.x, center.y, p5.Vector.sub(...major).heading(), A * width / 3, B * width / 3, angles[0], angles[1]],
    order: -1
  });

  // assignment stuff 

  let dates = [[[1986, 2, 28], [1986, 4, 13]], [[1988, 9, 16], [1988, 10, 27]]]

  let indices = dates.map(pair => pair.map(date => data.findIndex(n => int(n.split(',').slice(0, 3)).every((n, i) => n === date[i])) - 1)); // locate the points in the csv data, to plug find the  corresponding points on the orbit (The midpoints)

  let sweeps = dates.map((pair, i) => [ // Log the area and time in arrays
    abs(
      sweepArea(A, B, p5.Vector.sub(midpoints[indices[i][0]][0], center).heading() - p5.Vector.sub(...major).heading()) -
      sweepArea(A, B, p5.Vector.sub(midpoints[indices[i][1]][0], center).heading() - p5.Vector.sub(...major).heading())
    ),
    abs(
      DateToDays(pair[0][2], pair[0][1], pair[0][0], startYear) -
      DateToDays(pair[1][2], pair[1][1], pair[1][0], startYear)
    )
  ]);

  for (let output of sweeps){ // Display everything in html
    let tr = document.createElement("tr");

    let areaNode = document.createElement("td");
    areaNode.innerText = output[0].toString();
    tr.appendChild(areaNode);

    let timeNode = document.createElement("td");
    timeNode.innerText = output[1].toString();
    tr.appendChild(timeNode);

    let ratioNode = document.createElement("td");
    ratioNode.innerText = (output[0] / output[1]).toString();
    tr.appendChild(ratioNode)
    document.getElementById("SecondLaw").appendChild(tr);
  }

  // Calculate relative error and display ellipse parameters in HTML

  let ids = ['a', 'b', 'e', 't'];
  let values = [A, B, E, orbitalPeriod];
  let expected = [.387, .379, .206, 87.969]; // source for the last one: https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html

  for (i in values){
    let valueNode = document.createElement("td");
    valueNode.innerText = values[i].toString();
    document.getElementById(ids[i]).appendChild(valueNode);

    let expectedNode = document.createElement("td");
    expectedNode.innerText = expected[i].toString();
    document.getElementById(ids[i]).appendChild(expectedNode);

    let errorNode = document.createElement("td");
    errorNode.innerText = (round(10000*abs(values[i] - expected[i]) / expected[i])/100).toString() + '%';
    document.getElementById(ids[i]).appendChild(errorNode);
  }

  calculated = true; // set this flag to true so that it does not recalculate
}

function sweepArea(a, b, theta) {
  let quarters = floor(theta / (PI / 2));

  let area = quarters * (PI * a * b) / 4;

  theta -= quarters * PI / 2;

  area += theta * (a * a + b * b) + b * (a * atan((sin(theta) * sqrt(a * a - b * b)) / b) - (2 * b * sin(theta) * ((b * b - a * a) * cos(theta) + a * sqrt((a - b) * (a + b))) + a * ((b * b - a * a) * cos(2 * theta) + a * a + b * b) * atan(a * tan(theta) / b)) / ((b * b - a * a) * cos(2 * theta) + a * a + b * b)); // hellish integral of 𝑟(𝜃)2/2 over 𝑑𝜃: I might be able to do this myself, but this is obscene so I just used this article: https://math.stackexchange.com/a/692750

  return area;
}

function DateToDays(d, m, y, start) {
  days = d - 1; // ignore the second day, so today -> tomorrow is not 2 days
  for (let i = 0; i < m - 1; i++) {
    days += DaysEachMonth[i];
  } // add days for each month before it
  days += floor((y + int(days >= DaysEachMonth[0] + DaysEachMonth[1] - 1)) / 4) - floor(start / 4); // add days for each year + leap year before it
  return days;
}

// Function I used for another method of using a pentagon to find an inscribed conic section, lots of geometry magic that gave very extraneous results depending on which lines were chosen

// function ncr(a, b) {
//   let binStr = "".padStart(b, '1').padEnd(a, '0');
//   let combos = [];
//   let maxCombos = round(factorial(a, b + 1) / factorial(a - b));
//   // console.log(a, b, maxCombos)

//   while (combos.length <= maxCombos) {
//     combos.push(binStr);
//     if (binStr.slice(a - b, a).includes('0')) {
//       if (binStr[a - 1] == '1') {
//         let n = a - binStr.lastIndexOf('0') - 1;
//         for (let i = a - n - 1; i < a; i++) {
//           binStr = replIndex(binStr, i, '0');
//         }
//         let nextDigit = binStr.lastIndexOf('1');
//         binStr = replIndex(binStr, nextDigit, '0');
//         for (let i = 1; i <= n + 1; i++) {
//           if (nextDigit + i < binStr.length) {
//             binStr = replIndex(binStr, nextDigit + i, '1');
//           } else {
//             binStr += '1'
//           }
//         }
//         binStr = binStr.padEnd(a, '0');
//       } else {
//         let nextDigit = binStr.lastIndexOf('1');
//         binStr = replIndex(binStr, nextDigit, '0');
//         binStr = replIndex(binStr, nextDigit + 1, '1');
//       }
//     } else {
//       return combos;
//     }
//   }
// }

function intersect(l1, l2) { // Lines: [Point Vector, Point Vector]
  // ax + c = bx + d
  // Generally aggreed upon intersection function
  let a = (l1[1].y - l1[0].y) / (l1[1].x - l1[0].x);
  let c = l1[0].y - a * l1[0].x
  let b = (l2[1].y - l2[0].y) / (l2[1].x - l2[0].x);
  let d = l2[0].y - b * l2[0].x;

  return createVector((d - c) / (a - b), a * (d - c) / (a - b) + c);
}

function replIndex(a, i, binStr) { // A whole function for a feature that javascript probably has but I don't know about (also, it's unused now)
  let b = a.split('');
  b[i] = binStr;
  return b.join('');
}

function factorial(n, thresh = 1) { // basic factorial
  return (n <= thresh) ? thresh : n * factorial(n - 1, thresh);
}

function contains(p, corners) { // checking if every component of a point is between the components of two rectangle corners
  return [...corners].sort((v1, v2) => (v1.x - v2.x))[0].x <= p.x && p.x <= [...corners].sort((v1, v2) => (v2.x - v1.x))[0].x && [...corners].sort((v1, v2) => (v1.y - v2.y))[0].y <= p.y && p.y <= [...corners].sort((v1, v2) => (v2.y - v1.y))[0].y;
}

function reflect(l1, l2) { // a reflection function using the a line to flip the direction of an incoming ray across a perpendicular line at the intersection point
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
  // find every possible vertex of the containing polygon

  intersections = intersections.filter(i1 => { // filter out any that have a tangent line between them and the sun (meaning they are outside the polygon)
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

  // sort them by angle
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
  let potentialFoci = []; // prepare variables for export
  for (let i in intersections) {
    i = parseInt(i);
    let intersection = intersections[i];
    let intersection2 = intersections[(i + 1) % intersections.length];
    // load 2 consecutive points
    renderingCache[cachePosition].data.push([intersection[0].x, intersection[0].y, intersection2[0].x, intersection2[0].y]);

    let index = (intersection[1] == intersection2[1] || intersection[1] == intersection2[2]) ? 1 : (intersection[2] == intersection2[1] || intersection[2] == intersection2[2]) ? 2 : null;
    // find the common line between the points of the polygon (the line that is makes up an edge of the polygon)

    let tanLine = tangents[intersection[index]];

    midpoints.push([p5.Vector.add(intersection2[0], p5.Vector.div(p5.Vector.sub(intersection[0], intersection2[0]), 2)), tanLine]); // add the midpoint of the intersections, and parent the tangent line

    renderingCache[cachePosition + 1].data.push([midpoints[midpoints.length - 1][0].x, midpoints[midpoints.length - 1][0].y])

    focusLines.push(reflect([SunPos, midpoints[midpoints.length - 1][0]], midpoints[midpoints.length - 1][1]));

    focusLines[focusLines.length - 1][1] = p5.Vector.add(focusLines[focusLines.length - 1][0], p5.Vector.mult(p5.Vector.sub(focusLines[focusLines.length - 1][1], focusLines[focusLines.length - 1][0]), width)); // the "focus lines" are the reflections off of the ellipse if a ray was cast from the sun, because any reflection of a ray originating from one focus will be reflected off of the ellipse directly at the other focu

    renderingCache[cachePosition + 2].data.push(...[
      [SunPos.x, SunPos.y, focusLines[focusLines.length - 1][0].x, focusLines[focusLines.length - 1][0].y],
      [focusLines[focusLines.length - 1][0].x, focusLines[focusLines.length - 1][0].y, focusLines[focusLines.length - 1][1].x, focusLines[focusLines.length - 1][1].y]
    ]); // Draw both the line towards the midpoint and the reflection
    for (let j = 0; j < focusLines.length - 1; j++) {
      potentialFoci.push(intersect(focusLines[focusLines.length - 1], focusLines[j])); // intersect the newest reflection with all the prior reflections to find the potential foci
    }
  }

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
  }); // any foci that are outside of the polygon (two focus lines narrowly missed, but extend outside the polygon) are ignored

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
      error += focus.dist(focus2); // find the "median" focus by minimising { ∑ sqrt( f1^2 + f2^2 ) ) }
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

async function processThirdLawData(path){
  // Literally just the math that you're supposed to do in the assignment
  let data = (await (await fetch(path)).text()).split('\n').map(line => line.split(','));

  let mean = 0;
  for (planet of data.slice(1)){
    let tr = document.createElement("tr");

    planet = [planet[0], ...float(planet.slice(1))];

    let nameNode = document.createElement("td");
    nameNode.innerText = planet[0].toString();
    tr.appendChild(nameNode);

    let SPNode = document.createElement("td");
    SPNode.innerText = planet[1].toString();
    tr.appendChild(SPNode);

    let SMANode = document.createElement("td");
    SMANode.innerText = planet[2].toString();
    tr.appendChild(SMANode);

    let SP2Node = document.createElement("td");
    SP2Node.innerText = (round(100*planet[1]**2)/100).toString();
    tr.appendChild(SP2Node);

    let SMA3Node = document.createElement("td");
    SMA3Node.innerText = (round(100*planet[2]**3)/100).toString();
    tr.appendChild(SMA3Node);

    let ResultNode = document.createElement("td");
    ResultNode.innerText = (planet[1]**2 / planet[2]**3).toString();
    tr.appendChild(ResultNode);

    document.getElementById("ThirdLaw").appendChild(tr);

    mean += planet[1]**2 / planet[2]**3;
  }
  mean /= data.length - 1;

  let stdDev = 0;
  for (planet of data.slice(1)){
    stdDev += (planet[1]**2 / planet[2]**3  - mean)**2
  }
  stdDev = sqrt((1/(data.length-1)) * stdDev);
  document.getElementById("ThirdLawStats").innerText = `µ = ${mean}, σ = ${stdDev}`;
}


window.addEventListener("load", e => {
  for (let input of document.getElementsByClassName("searchbar")) {
    input.addEventListener("keyup", searchBox);
  }

  // Make converter for AU and Years
  document.getElementById("SiderealPeriod").addEventListener("change", function (_){
    document.getElementById("SemiMajorAxis").value = ((float(this.value)**3)**(1/2)).toString();
  });
  document.getElementById("SemiMajorAxis").addEventListener("change", function (_){
    document.getElementById("SiderealPeriod").value = ((float(this.value)**2)**(1/3)).toString();
  });
});