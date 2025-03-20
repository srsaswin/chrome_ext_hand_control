let video;
let handPose;
let isModelReady = false;
let p5Canvas;
let c; // Moved to top-level scope
let p5Instance; // Store the p5 instance
let isToggle = false; // Added missing variable declaration

const controlData = {
    isEnabled: true,  // Default to false
    sensitivity: 5,
    isZoomable: true
};

function initializeCursor() {
    if (!document.getElementById("customCursor")) {
        c = document.createElement("div");
        c.id = "customCursor";
        c.style.cssText = `
            width: 10px;
            height: 10px;
            background-color: red;
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            display: none;
        `;
        document.body.appendChild(c);
    }
}
initializeCursor();

// Add at the top of content.js
chrome.storage.local.get('isEnabled', (data) => {
    controlData.isEnabled = data.isEnabled ?? false;
    c.style.display = controlData.isEnabled ? "block" : "none";

    if (controlData.isEnabled) {
        initializeP5();
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "toggleState") {
        controlData.isEnabled = message.isEnabled;
        console.log('Extension state:', controlData.isEnabled);

        if (controlData.isEnabled) {
            c.style.display = "block";
            initializeP5();
        } else {
            c.style.display = "none";
            stopHandTracking();
        }
    }
});

function initializeP5() {
    // Create a new p5 instance
    if (!p5Instance) {
        p5Instance = new p5((p) => {
            p.setup = function() {
                p5Canvas = p.createCanvas(640, 480);
                p5Canvas.style('display', 'none');
                video = p.createCapture(p.VIDEO);
                video.size(640, 480);
                video.hide();

                // Initialize handpose
                handPose = ml5.handPose(video.elt, { flipHorizontal: true }, () => {
                    isModelReady = true;
                    const tempTitle = document.title;
                    document.title = "ok 👍";
                    setTimeout(() => { document.title = tempTitle; }, 1000);
                    handPose.detectStart(video.elt, gotHands);
                });
            };

            p.draw = function() {
                if (!controlData.isEnabled) {
                    if (p5Canvas) p5Canvas.style('display', 'none');
                    if (video) video.hide();
                    return;
                }

                if (p5Canvas) {
                    p5Canvas.style('display', 'block');
                }

                try {
                    p.image(video, 0, 0, p.width, p.height);

                    if (hands.length === 0) return;

                    let hand = hands[0].keypoints;

                    let pinkyFingerTip = hand[20];
                    let middleFingerTip = hand[12];
                    let inxFingerTip = hand[8];
                    let thumbFingerTip = hand[4];
                    let ringFingerTip = hand[16];

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

                    if(calculateDistance(thumbFingerTip, middleFingerTip) < 25){
                        if(!zoomControl.isZoomIn){
                            zoomControl.isZoomIn = true;
                            console.log("sim up");
                            if(controlData.isZoomable) zoomWindow(curserXY, true);
                            else simulateArrowKeystroke("up");
                        }
                    } else {
                        zoomControl.isZoomIn = false;
                    }

                    if(calculateDistance(thumbFingerTip, ringFingerTip) < 25){
                        if(!zoomControl.isZoomOut) {
                            zoomControl.isZoomOut = true;
                            console.log("sim down");
                            if(controlData.isZoomable) zoomWindow(curserXY, false);
                            else simulateArrowKeystroke("down");
                        }
                    } else {
                        zoomControl.isZoomOut = false;
                    }



                    p.fill(255, 0, 0, 150);
                    p.circle(pinkyFingerTip.x, pinkyFingerTip.y, 10);
                    p.circle(middleFingerTip.x, middleFingerTip.y, 10);
                    p.circle(inxFingerTip.x, inxFingerTip.y, 10);
                    p.circle(thumbFingerTip.x, thumbFingerTip.y, 10);

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
                } catch (e) {
                    console.log('Drawing error:', e);
                }
            };
        });
    }
}

function initializeHandTracking() {
    // This function is now handled by initializeP5()
    if (!p5Instance) {
        initializeP5();
    }
}

function stopHandTracking() {
    try {
        if (video?.elt?.srcObject) {
            video.elt.srcObject.getTracks().forEach(track => track.stop());
        }
        if (video) {
            video.remove();
            video = null;
        }
        if (p5Canvas) {
            p5Canvas.remove();
            p5Canvas = null;
        }
        if (handPose) {
            handPose.detectStop();
            handPose = null;
        }
        if (p5Instance) {
            p5Instance.remove();
            p5Instance = null;
        }
        isModelReady = false;
        resetStates();
    } catch (e) {
        console.error('Cleanup error:', e);
    }
}

function resetStates() {
    hands = [];
    isThumbClick = false;
    isToggleIsRest = true;
    zoomControl.isZoomIn = false;
    zoomControl.isZoomOut = false;
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

let hands = [];

function gotHands(results) {
    if (!controlData.isEnabled || !handPose || !isModelReady) return;
    hands = results;
}

const curserBoundry = getBoundry();
let isToggleIsRest = true;

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

const zoomControl = {
    isZoomIn: false,
    isZoomOut: false,
};

// Initialize cursor position
moveCursor(curserBoundry.x / 2, curserBoundry.y / 2);

////////////////////////////////////////////////////////////////////////// Helper Functions /////////////////////////////////////////////////////////////////////////////////

function zoomWindow(point, zoomIn = true) {
    let x = point.x, y = point.y;
    const scaleFactor = zoomIn ? 1.1 : 0.9;
    const body = document.body;

    // Get current scale from the transform style
    const currentTransform = window.getComputedStyle(body).transform;
    let currentScale = 1;
    if (currentTransform && currentTransform !== "none") {
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
    stopHandTracking();
});

// Handle window resize
window.addEventListener('resize', () => {
    const newBoundry = getBoundry();
    curserBoundry.x = newBoundry.x;
    curserBoundry.y = newBoundry.y;
});
