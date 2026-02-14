// Initialize the page when it loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the planner form
    initPlannerForm();
    
    // Initialize the check-in form
    initCheckInForm();
    
    // Initialize draggable progress bar
    initDraggableProgressBar();
});

// Initialize planner form
function initPlannerForm() {
    var form = document.getElementById('planner-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            generatePlan();
        });
    }
}

var totalPapersGlobal = 0;
var currentPlanGlobal = [];

// Generate revision plan
function generatePlan() {
    var subjectsInput = document.getElementById('subjects-list').value;
    var papersInput = document.getElementById('papers-left').value;
    var hoursLeft = parseInt(document.getElementById('hours-left').value);
    var reserveDays = parseInt(document.getElementById('reserve-days').value);
    
    // Validate input
    if (!subjectsInput || !papersInput || !hoursLeft) {
        document.getElementById('plan-result').innerHTML = '<p>Please fill in all required fields.</p>';
        return;
    }
    
    // Parse subjects and papers
    var subjects = subjectsInput.split(',').map(function(s) { return s.trim(); });
    var papers = papersInput.split(',').map(function(p) { return parseFloat(p.trim()); });
    
    if (subjects.length !== papers.length) {
        document.getElementById('plan-result').innerHTML = '<p>Please enter the same number of subjects and papers.</p>';
        return;
    }
    
    // Calculate total available days (assuming 8 hours per day)
    var totalDays = Math.floor(hoursLeft / 8);
    var studyDays = Math.max(1, totalDays - reserveDays);
    
    if (studyDays < 1) {
        document.getElementById('plan-result').innerHTML = '<p>Not enough time. Please increase the hours left or decrease reserve days.</p>';
        return;
    }
    
    // Calculate total papers
    totalPapersGlobal = papers.reduce(function(sum, p) { return sum + p; }, 0);
    
    if (totalPapersGlobal === 0) {
        document.getElementById('plan-result').innerHTML = '<p>No papers to review.</p>';
        return;
    }
    
    // Generate plan
    var plan = [];
    var remainingPapers = papers.slice();
    
    // Create distribution strategy (front-light, back-heavy)
    var distribution = [];
    for (var i = 0; i < studyDays; i++) {
        // Exponential distribution for front-light, back-heavy
        var weight = Math.pow(i / (studyDays - 1), 1.5);
        distribution.push(weight);
    }
    
    // Normalize distribution
    var totalWeight = distribution.reduce(function(sum, w) { return sum + w; }, 0);
    var normalizedDistribution = distribution.map(function(w) { return w / totalWeight; });
    
    // Generate daily plan
    for (var day = 1; day <= studyDays; day++) {
        var dayPlan = {
            day: day,
            tasks: []
        };
        
        // Calculate papers for this day
        var dayPapers = totalPapersGlobal * normalizedDistribution[day - 1];
        var papersAssigned = 0;
        
        // Assign papers to subjects
        for (var j = 0; j < subjects.length; j++) {
            var subject = subjects[j];
            if (remainingPapers[j] > 0) {
                // Calculate proportion for this subject
                var subjectProportion = papers[j] / totalPapersGlobal;
                var papersForSubject = dayPapers * subjectProportion;
                
                // Adjust if we don't have enough papers
                papersForSubject = Math.min(papersForSubject, remainingPapers[j]);
                
                if (papersForSubject > 0) {
                    // Round to 0.5 papers
                    papersForSubject = Math.round(papersForSubject * 2) / 2;
                    
                    dayPlan.tasks.push({
                        subject: subject,
                        papers: papersForSubject
                    });
                    
                    remainingPapers[j] -= papersForSubject;
                    papersAssigned += papersForSubject;
                }
            }
        }
        
        plan.push(dayPlan);
    }
    
    // Store plan globally
    currentPlanGlobal = plan;
    
    // Display plan
    displayPlan(plan, reserveDays);
}

// Display the generated plan
function displayPlan(plan, reserveDays) {
    var resultDiv = document.getElementById('plan-result');
    
    var html = '<h3>Your Revision Plan</h3>';
    
    // Calculate total papers assigned
    var totalPapersAssigned = 0;
    for (var i = 0; i < plan.length; i++) {
        var dayPlan = plan[i];
        for (var j = 0; j < dayPlan.tasks.length; j++) {
            totalPapersAssigned += dayPlan.tasks[j].papers;
        }
    }
    
    // Update progress bar
    updateProgressBar(totalPapersAssigned, totalPapersGlobal);
    
    // Generate workload chart
    generateWorkloadChart(plan);
    
    for (var i = 0; i < plan.length; i++) {
        var dayPlan = plan[i];
        html += '<div class="plan-day">';
        html += '<h4>Day ' + dayPlan.day + ':</h4>';
        html += '<ul>';
        
        for (var j = 0; j < dayPlan.tasks.length; j++) {
            var task = dayPlan.tasks[j];
            html += '<li>' + task.subject + ': ' + task.papers + ' paper' + (task.papers !== 1 ? 's' : '') + '</li>';
        }
        
        html += '</ul>';
        html += '</div>';
    }
    
    if (reserveDays > 0) {
        html += '<div class="plan-day">';
        html += '<h4>Days ' + (plan.length + 1) + ' to ' + (plan.length + reserveDays) + ':</h4>';
        html += '<ul>';
        html += '<li>Final revision and practice</li>';
        html += '<li>Review错题 (mistakes)</li>';
        html += '<li>Relax and prepare mentally</li>';
        html += '</ul>';
        html += '</div>';
    }
    
    resultDiv.innerHTML = html;
}

// Update progress bar
function updateProgressBar(completed, total) {
    var progressBar = document.querySelector('.progress-bar');
    var progressText = document.querySelector('.progress-text');
    
    if (progressBar && progressText) {
        var percentage = Math.round((completed / total) * 100);
        progressBar.style.width = percentage + '%';
        progressText.textContent = percentage + '%';
    }
}

// Initialize draggable progress bar
function initDraggableProgressBar() {
    var progressContainer = document.querySelector('.progress-bar-container');
    var progressBar = document.querySelector('.progress-bar');
    var progressHandle = document.querySelector('.progress-handle');
    var progressText = document.querySelector('.progress-text');
    
    if (!progressContainer || !progressBar || !progressHandle) return;
    
    var isDragging = false;
    
    // Handle mouse down on progress bar
    progressContainer.addEventListener('mousedown', function(e) {
        updateProgressFromMouse(e);
        isDragging = true;
    });
    
    // Handle mouse down on handle
    progressHandle.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        isDragging = true;
    });
    
    // Handle mouse move
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            updateProgressFromMouse(e);
        }
    });
    
    // Handle mouse up
    document.addEventListener('mouseup', function() {
        isDragging = false;
    });
    
    // Handle mouse leave
    document.addEventListener('mouseleave', function() {
        isDragging = false;
    });
    
    // Update progress based on mouse position
    function updateProgressFromMouse(e) {
        var rect = progressContainer.getBoundingClientRect();
        var offsetX = e.clientX - rect.left;
        var percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
        
        progressBar.style.width = percentage + '%';
        progressText.textContent = Math.round(percentage) + '%';
    }
}

// Generate workload distribution chart
function generateWorkloadChart(plan) {
    var chartContainer = document.querySelector('.workload-chart');
    if (!chartContainer) return;
    
    // Clear existing chart
    chartContainer.innerHTML = '';
    
    // Calculate max papers per day for scaling
    var maxPapers = 0;
    for (var i = 0; i < plan.length; i++) {
        var dayPapers = 0;
        for (var j = 0; j < plan[i].tasks.length; j++) {
            dayPapers += plan[i].tasks[j].papers;
        }
        if (dayPapers > maxPapers) {
            maxPapers = dayPapers;
        }
    }
    
    // Set chart width based on number of days
    var chartWidth = Math.max(400, plan.length * 40);
    chartContainer.style.width = chartWidth + 'px';
    
    // Create chart columns
    for (var i = 0; i < plan.length; i++) {
        var dayPlan = plan[i];
        var dayPapers = 0;
        for (var j = 0; j < dayPlan.tasks.length; j++) {
            dayPapers += dayPlan.tasks[j].papers;
        }
        
        // Calculate column height (max 150px)
        var height = maxPapers > 0 ? (dayPapers / maxPapers) * 150 : 0;
        
        // Create column element
        var column = document.createElement('div');
        column.className = 'chart-column';
        column.style.height = height + 'px';
        column.style.left = (i * 40 + 10) + 'px';
        
        // Create label
        var label = document.createElement('div');
        label.className = 'chart-column-label';
        label.textContent = 'Day ' + dayPlan.day;
        label.style.left = (i * 40 + 10) + 'px';
        
        chartContainer.appendChild(column);
        chartContainer.appendChild(label);
    }
}

// Initialize check-in form
function initCheckInForm() {
    var form = document.getElementById('check-in-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            processCheckIn();
        });
    }
}

// Process check-in
function processCheckIn() {
    var subject = document.getElementById('today-subject').value;
    var hours = parseFloat(document.getElementById('study-hours').value);
    
    if (!subject || isNaN(hours)) {
        alert('Please fill in all fields.');
        return;
    }
    
    // Display summary
    var summaryContent = document.getElementById('summary-content');
    summaryContent.innerHTML = 
        '<p><strong>Subject:</strong> ' + subject + '</p>' +
        '<p><strong>Study Hours:</strong> ' + hours + ' hours</p>' +
        '<p><strong>Date:</strong> ' + new Date().toLocaleDateString() + '</p>';
    
    // Update chart
    updateChart(hours);
}

// Update study hours chart
function updateChart(hours) {
    var chart = document.getElementById('study-chart');
    chart.innerHTML = '';
    
    // Check if we have plan data
    if (currentPlanGlobal && currentPlanGlobal.length > 0) {
        // Use plan data to generate chart
        generateCheckInChartFromPlan(chart, hours);
    } else {
        // Fallback to single bar if no plan data
        var bar = document.createElement('div');
        bar.className = 'chart-bar';
        
        // Calculate height (max 150px for 10 hours)
        var height = Math.min(hours * 15, 150);
        bar.style.height = height + 'px';
        bar.style.left = '50%';
        bar.style.transform = 'translateX(-50%)';
        
        // Create label
        var label = document.createElement('div');
        label.className = 'chart-label';
        label.textContent = hours + 'h';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        
        chart.appendChild(bar);
        chart.appendChild(label);
    }
}

// Generate check-in chart from plan data
function generateCheckInChartFromPlan(chart, todayHours) {
    // Calculate max papers per day for scaling
    var maxPapers = 0;
    for (var i = 0; i < currentPlanGlobal.length; i++) {
        var dayPlan = currentPlanGlobal[i];
        var dayPapers = 0;
        for (var j = 0; j < dayPlan.tasks.length; j++) {
            dayPapers += dayPlan.tasks[j].papers;
        }
        if (dayPapers > maxPapers) {
            maxPapers = dayPapers;
        }
    }
    
    // Set chart width based on number of days
    var chartWidth = Math.max(400, currentPlanGlobal.length * 40);
    chart.style.width = chartWidth + 'px';
    chart.style.height = '200px';
    chart.style.position = 'relative';
    chart.style.backgroundColor = '#f9f9f9';
    chart.style.borderRadius = '8px';
    chart.style.padding = '1rem';
    chart.style.overflowX = 'auto';
    
    // Create chart columns
    for (var i = 0; i < currentPlanGlobal.length; i++) {
        var dayPlan = currentPlanGlobal[i];
        var dayPapers = 0;
        for (var j = 0; j < dayPlan.tasks.length; j++) {
            dayPapers += dayPlan.tasks[j].papers;
        }
        
        // Calculate column height (max 150px)
        var height = maxPapers > 0 ? (dayPapers / maxPapers) * 150 : 0;
        
        // Create column element
        var column = document.createElement('div');
        column.className = 'chart-column';
        column.style.height = height + 'px';
        column.style.left = (i * 40 + 10) + 'px';
        
        // Highlight today's column if applicable
        if (dayPlan.day === 1) { // Assuming Day 1 is today
            column.style.backgroundColor = '#555';
        }
        
        // Create label
        var label = document.createElement('div');
        label.className = 'chart-column-label';
        label.textContent = 'Day ' + dayPlan.day;
        label.style.left = (i * 40 + 10) + 'px';
        
        chart.appendChild(column);
        chart.appendChild(label);
    }
    
    // Add today's study hours indicator if provided
    if (todayHours > 0) {
        var todayIndicator = document.createElement('div');
        todayIndicator.style.position = 'absolute';
        todayIndicator.style.bottom = '1rem';
        todayIndicator.style.left = '10px';
        todayIndicator.style.padding = '5px 10px';
        todayIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        todayIndicator.style.borderRadius = '4px';
        todayIndicator.style.fontSize = '0.8rem';
        todayIndicator.style.fontWeight = 'bold';
        todayIndicator.textContent = 'Today: ' + todayHours + 'h';
        chart.appendChild(todayIndicator);
    }
}
