document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("tog");
    button.addEventListener("click", function () {
        document.getElementById("hi").innerHTML = "Hand Mode Toggled!";
        console.log('hi');
    });
});
