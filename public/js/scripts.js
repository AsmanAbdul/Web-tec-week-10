document.addEventListener('DOMContentLoaded', function () {
    const courseForm = document.getElementById('course-form');
    if (courseForm) {
        courseForm.addEventListener('submit', function (e) {
            const checkboxes = document.querySelectorAll('input[name="courses"]:checked');
            const selectedCourses = Array.from(checkboxes).map(cb => cb.value);
            
            if (selectedCourses.length === 0) {
                alert('Please select at least one course.');
                e.preventDefault();
            }
        });
    }
});
