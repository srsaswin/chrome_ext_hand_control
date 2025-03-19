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
            updataCurserXY((middleFingerTip.x - refCurserXY.x) / 5, (middleFingerTip.y - refCurserXY.y) / 5, curserXY);
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
