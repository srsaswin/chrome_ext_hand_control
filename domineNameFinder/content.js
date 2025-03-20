let c = createCustomCursor();
let isToggle = false;

function createCustomCursor() {
    console.log("Custom cursor initialized");

    if (!document.getElementById("customCursor")) {
        const c = document.createElement("div");
        c.id = "customCursor";
        c.style = `
            width: 10px;
            height: 10px;
            background-color: red; 
            position: absolute;
            pointer-events: none;
            z-index: 9999;
            display: none;
        `;
        document.body.appendChild(c);
        c.style.display = "block";

        return c;
    }
}

function moveCursor(x, y) {
    c.style.left = x + "px";
    c.style.top = y + "px";
}

function cursor_click() {
    const x = Math.round(mirrorCurserXY.x);
    const y = Math.round(mirrorCurserXY.y);
    console.log(`Clicking at: (${x}, ${y})`);

    const element = document.elementFromPoint(x, y);
    if (element) {
        console.log('Selected Element:', element);
        element.style.border = '2px solid red'; // Highlight the element for debugging
        const clickableElement = findAndClick(element);
        if (clickableElement) clickableElement.click();
    } else {
        console.log('No element found at the specified coordinates.');
    }
}

function findAndClick(element) {
    while (element) {
        if (isClickable(element)) {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}

function isClickable(element) {
    const clickableTags = ["BUTTON", "A", "INPUT", "LABEL","SPAN"];
    if (clickableTags.includes(element.tagName)) {
        return true;
    }
    return element.onclick || element.getAttribute("onclick") !== null;
}

let video;

let hands = [];


// Replace the existing preload() and setup() with:

let handPose;
let isModelReady = false; // Flag to track model state

function preload() {
    // Initialize handpose with a callback
    if (typeof ml5 !== 'undefined') {
        handPose = ml5.handPose(video, { flipHorizontal: true }, () => {
            console.log("Model ready!");
            const tempTitle = document.title;
            document.title = "ready to roll 👻";
            setTimeout(()=>document.title = tempTitle,1500);
            isModelReady = true; // Set flag when model loads
        });
    }
}

function setup() {
    createCanvas(640, 480);
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

    // Start detection ONLY when model is ready
    const checkModel = () => {
        if (isModelReady) {
            handPose.detectStart(video, gotHands);
        } else {
            setTimeout(checkModel, 100); // Retry every 100ms
        }
    };
    checkModel();
}

function gotHands(results) {
    if (!handPose || !isModelReady) return; // Guard clause
    hands = results;
}

const curserBoundry = getBoundry();
moveCursor(curserBoundry.x / 2, curserBoundry.y / 2);

const curserXY = {
    x: curserBoundry.x / 2,
    y: curserBoundry.y / 2,
    px: 0,
    py: 0
};

const refCurserXY = {
    isReferd: false,
    x: 0,
    y: 0
};

const mirrorCurserXY = {
    x: 0,
    y: 0
};

let isThumbClick = false;

let isToggleIsRest = true;

const zoomControl = {
    isZoomIn: false,
    isZoomOut: false,
};

const controlData = {
    sensitivity:5,
    isZoomable: false
};

function draw() {
    // translate(width, 0);  // Move to the right edge
    // scale(-1, 1);
    image(video, 0, 0, width, height);

    if (hands.length == 0) return;

    let hand = hands[0].keypoints;

    let pinkyFingerTip = hand[20];
    let middleFingerTip = hand[12];
    let inxFingerTip = hand[8];
    let thumbFingerTip = hand[4];
    let ringFingerTip = hand[16];

    if(calculateDistance(thumbFingerTip,middleFingerTip) < 25){
        if(!zoomControl.isZoomIn){
            zoomControl.isZoomIn = true;
            console.log("sim up");
            if(controlData.isZoomable) zoomWindow(curserXY, true);
            else simulateArrowKeystroke("up");
        }
    }else{
        zoomControl.isZoomIn = false;
    }

    if(calculateDistance(thumbFingerTip,ringFingerTip) < 25){
        if(!zoomControl.isZoomOut) {
            zoomControl.isZoomOut = true;
            console.log("sim down");
            if(controlData.isZoomable) zoomWindow(curserXY, false);
            else simulateArrowKeystroke("down");
        }
    }else{
        zoomControl.isZoomOut = false;
    }

    // Toggle cursor visibility
    if (calculateDistance(pinkyFingerTip, thumbFingerTip) < 25) {
        if (isToggleIsRest) {
            isToggleIsRest = false;
            isToggle = !isToggle;
            if (isToggle) {
                c.style.display = "none";
            } else {
                c.style.display = "block";
            }
            console.log('Toggled cursor visibility');
        }
    }

    if (calculateDistance(pinkyFingerTip, thumbFingerTip) > 50) {
        isToggleIsRest = true;
    }

    if (isToggle) return;

    fill(255, 0, 0, 150);
    circle(pinkyFingerTip.x, pinkyFingerTip.y, 10);
    circle(middleFingerTip.x, middleFingerTip.y, 10);
    circle(inxFingerTip.x, inxFingerTip.y, 10);
    circle(thumbFingerTip.x, thumbFingerTip.y, 10);

    if (calculateDistance(inxFingerTip, middleFingerTip) < 27) {
        if (!refCurserXY.isReferd) {
            refCurserXY.isReferd = true;
            refCurserXY.x = middleFingerTip.x;
            refCurserXY.y = middleFingerTip.y;
            console.log('Cursor reference set');
        } else {
            updataCurserXY((middleFingerTip.x - refCurserXY.x) / controlData.sensitivity, (middleFingerTip.y - refCurserXY.y) / controlData.sensitivity, curserXY);
        }
    } else {
        refCurserXY.isReferd = false;
    }

    if (calculateDistance(inxFingerTip, thumbFingerTip) < 20) {
        if (!isThumbClick) {
            isThumbClick = true;
            console.log('Simulated click');
            cursor_click();
        }
    } else {
        isThumbClick = false;
    }
}

////////////////////////////////////////////////////////////////////////// Helper Functions /////////////////////////////////////////////////////////////////////////////////

function zoomWindow(point, zoomIn = true) {
    let x = point.x,y = point.y;

    const scaleFactor = zoomIn ? 1.1 : 0.9;
    const body = document.body;

    // Get current scale from the transform style
    const currentTransform = window.getComputedStyle(body).transform;
    let currentScale = 1;
    if (currentTransform !== "none") {
        const match = currentTransform.match(/matrix\(([^,]+),/);
        if (match) {
            currentScale = parseFloat(match[1]);
        }
    }

    // Calculate new scale
    const newScale = currentScale * scaleFactor;

    // Calculate the transform origin as a percentage
    const originX = (x / window.innerWidth) * 100;
    const originY = (y / window.innerHeight) * 100;

    // Apply the transformation
    body.style.transformOrigin = `${originX}% ${originY}%`;
    body.style.transform = `scale(${newScale})`;
}









function simulateArrowKeystroke(direction) {
    const keyMap = {
        up: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
        down: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
        left: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
        right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 }
    };

    if (!keyMap[direction]) {
        console.error("Invalid direction! Use 'up', 'down', 'left', or 'right'.");
        return;
    }

    const event = new KeyboardEvent("keydown", {
        key: keyMap[direction].key,
        code: keyMap[direction].code,
        keyCode: keyMap[direction].keyCode,
        which: keyMap[direction].keyCode,
        bubbles: true,
    });

    document.dispatchEvent(event);
}
//
// // Example usage
// simulateArrowKeystroke("up");    // Simulate Up Arrow key
// simulateArrowKeystroke("down");  // Simulate Down Arrow key
// simulateArrowKeystroke("left");  // Simulate Left Arrow key
// simulateArrowKeystroke("right"); // Simulate Right Arrow key



function updataCurserXY(x, y, curserXY) {
    let t = false;
    if (Math.abs(x - curserXY.px) > 0) {
        if (curserXY.x + x <= curserBoundry.x && curserXY.x + x >= 0) {
            curserXY.x += x;
            curserXY.px = x;
            mirrorCurserXY.x  = curserXY.x;
        }
        t = true;
    }
    if (Math.abs(y - curserXY.py) > 0) {
        if (curserXY.y + y <= curserBoundry.y && curserXY.y + y >= 0) {
            curserXY.y += y;
            curserXY.py = y;
            mirrorCurserXY.y = curserXY.y;
        }
        t = true;
    }
    if (t) {
        moveCursor(mirrorCurserXY.x, mirrorCurserXY.y);
    }
}

function calculateDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function getBoundry() {
    return {
        x: window.innerWidth,
        y: window.innerHeight
    };
}

window.addEventListener('beforeunload', () => {
    // Reset model state
    isModelReady = false;

    if (handPose) {
        handPose.detectStop();
        handPose = null; // Explicitly nullify
    }

    if (video) {
        video.stop();
        video.remove();
        video = null;
    }

    // Remove p5.js elements
    noCanvas();
    const p5Canvas = document.querySelector('canvas');
    if (p5Canvas) p5Canvas.remove();
});
