// This file handles routing between different pages of the portfolio website.

document.addEventListener("DOMContentLoaded", function() {
    const links = document.querySelectorAll('a[data-route]');
    
    links.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetPage = this.getAttribute('href');
            loadPage(targetPage);
        });
    });

    function loadPage(page) {
        fetch(page)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(html => {
                document.getElementById('content').innerHTML = html;
                window.history.pushState({ page: page }, '', page);
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    }

    window.onpopstate = function(event) {
        if (event.state) {
            loadPage(event.state.page);
        }
    };
});