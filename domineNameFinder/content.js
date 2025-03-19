let c = createCustomCursor();
let isToggle = false;

// Create a custom cursor element
function createCustomCursor() {
    console.log("Custom cursor initialized");

    if (!document.getElementById("customCursor")) {
        const c = document.createElement("div");
        c.id = "customCursor";
        c.style = `
            width: 2px;
            height: 2px;
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

// Move the custom cursor to the specified coordinates
function moveCursor(x, y) {
    c.style.left = x + "px";
    c.style.top = y + "px";
}

// Simulate a click at the cursor's position
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

// Find the nearest clickable element
function findAndClick(element) {
    while (element) {
        if (isClickable(element)) {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}

// Check if an element is clickable
function isClickable(element) {
    const clickableTags = ["BUTTON", "A", "INPUT", "LABEL","SPAN"];
    if (clickableTags.includes(element.tagName)) {
        return true;
    }
    return element.onclick || element.getAttribute("onclick") !== null;
}

// Variables for hand tracking
let video;
let handPose;
let hands = [];

// Preload the handpose model
function preload() {
    handPose = ml5.handPose();
}

// Setup the canvas and video
function setup() {
    createCanvas(640, 480);
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

    handPose.detectStart(video, gotHands);
}

// Callback for hand detection
function gotHands(results) {
    hands = results;
}

// Boundary for the cursor
const curserBoundry = getBoundry();
moveCursor(curserBoundry.x / 2, curserBoundry.y / 2);

// Cursor position tracking
const curserXY = {
    x: curserBoundry.x / 2,
    y: curserBoundry.y / 2,
    px: 0,
    py: 0
};

// Reference cursor position for relative movement
const refCurserXY = {
    isReferd: false,
    x: 0,
    y: 0
};

// Mirrored cursor position
const mirrorCurserXY = {
    x: 0,
    y: 0
};

// Thumb click state
let isThumbClick = false;

// Toggle state for cursor visibility
let isToggleIsRest = true;

// Main draw loop
function draw() {
    translate(width, 0);  // Move to the right edge
    scale(-1, 1);
    image(video, 0, 0, width, height);

    if (hands.length == 0) return;

    let hand = hands[0].keypoints;

    let pinkyFingerTip = hand[20];
    let middleFingerTip = hand[12];
    let inxFingerTip = hand[8];
    let thumbFingerTip = hand[4];

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

    // Draw hand landmarks for debugging
    fill(255, 0, 0, 150);
    circle(pinkyFingerTip.x, pinkyFingerTip.y, 10);
    circle(middleFingerTip.x, middleFingerTip.y, 10);
    circle(inxFingerTip.x, inxFingerTip.y, 10);
    circle(thumbFingerTip.x, thumbFingerTip.y, 10);

    // Update cursor position based on hand movement
    if (calculateDistance(inxFingerTip, middleFingerTip) < 27) {
        if (!refCurserXY.isReferd) {
            refCurserXY.isReferd = true;
            refCurserXY.x = middleFingerTip.x;
            refCurserXY.y = middleFingerTip.y;
            console.log('Cursor reference set');
        } else {
            updataCurserXY((middleFingerTip.x - refCurserXY.x) / 5, (middleFingerTip.y - refCurserXY.y) / 5, curserXY);
        }
    } else {
        refCurserXY.isReferd = false;
    }

    // Simulate a click when thumb and index finger are close
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

// Update cursor position
function updataCurserXY(x, y, curserXY) {
    let t = false;
    if (Math.abs(x - curserXY.px) > 0) {
        if (curserXY.x + x <= curserBoundry.x && curserXY.x + x >= 0) {
            curserXY.x += x;
            curserXY.px = x;
            mirrorCurserXY.x = curserBoundry.x - curserXY.x;
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

// Calculate distance between two points
function calculateDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Get the boundary of the window
function getBoundry() {
    return {
        x: window.innerWidth,
        y: window.innerHeight
    };
}