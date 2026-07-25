document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let currentFilter = 'all'; // all, active, done, high_priority
    let currentSearch = '';
    let currentSort = 'created_at';
    let currentPriority = 'medium';
    let tasks = [];
    let activeTask = null;
    let currentUser = null;

    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const addTaskForm = document.getElementById('addTaskForm');
    const taskContentInput = document.getElementById('taskContentInput');
    const taskDueDateInput = document.getElementById('taskDueDateInput');
    const taskList = document.getElementById('taskList');
    const emptyView = document.getElementById('emptyView');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const filterPills = document.querySelectorAll('.filter-pill');
    const priorityPills = document.querySelectorAll('.priority-pill');

    // Stat Elements
    const statTotal = document.getElementById('statTotal');
    const statDone = document.getElementById('statDone');
    const statPending = document.getElementById('statPending');
    const completionPercent = document.getElementById('completionPercent');
    const completionBarFill = document.getElementById('completionBarFill');

    // User & Account Elements
    const accountDropdownBtn = document.getElementById('accountDropdownBtn');
    const accountDropdown = document.getElementById('accountDropdown');
    const userName = document.getElementById('userName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const openAccountModalBtn = document.getElementById('openAccountModalBtn');

    // Account Modal Elements
    const accountModalOverlay = document.getElementById('accountModalOverlay');
    const accountModal = document.getElementById('accountModal');
    const closeAccountModalBtn = document.getElementById('closeAccountModalBtn');
    const accountModalAlert = document.getElementById('accountModalAlert');
    const modalUsername = document.getElementById('modalUsername');
    const modalEmail = document.getElementById('modalEmail');
    const modalJoinedDate = document.getElementById('modalJoinedDate');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const deleteAccountForm = document.getElementById('deleteAccountForm');

    // Drawer Elements
    const drawerOverlay = document.getElementById('drawerOverlay');
    const taskDrawer = document.getElementById('taskDrawer');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const drawerStarBtn = document.getElementById('drawerStarBtn');
    const drawerTaskTitle = document.getElementById('drawerTaskTitle');
    const subtaskProgressBar = document.getElementById('subtaskProgressBar');
    const subtaskProgressFill = document.getElementById('subtaskProgressFill');
    const subtaskList = document.getElementById('subtaskList');
    const addSubtaskForm = document.getElementById('addSubtaskForm');
    const subtaskInput = document.getElementById('subtaskInput');
    const drawerPriority = document.getElementById('drawerPriority');
    const drawerDueDate = document.getElementById('drawerDueDate');
    const drawerNotes = document.getElementById('drawerNotes');
    const drawerCreatedDate = document.getElementById('drawerCreatedDate');
    const drawerDeleteTaskBtn = document.getElementById('drawerDeleteTaskBtn');

    // Priority Selection in Add Task Form
    priorityPills.forEach(pill => {
        pill.addEventListener('click', () => {
            priorityPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentPriority = pill.getAttribute('data-priority');
        });
    });

    // Filter Pills Switch
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.getAttribute('data-filter');
            fetchTasks();
        });
    });

    // Sort Dropdown
    sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        fetchTasks();
    });

    // Account Dropdown Toggle
    if (accountDropdownBtn) {
        accountDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            accountDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!accountDropdownBtn.contains(e.target)) {
                accountDropdown.classList.remove('active');
            }
        });
    }

    // Account Settings Modal
    function openAccountModal() {
        if (accountDropdown) accountDropdown.classList.remove('active');
        clearModalAlert();
        if (currentUser) {
            modalUsername.innerText = currentUser.username;
            modalEmail.innerText = currentUser.email;
            modalJoinedDate.innerText = currentUser.created_at || 'Recently';
        }
        accountModalOverlay.classList.add('active');
        accountModal.classList.add('active');
    }

    function closeAccountModal() {
        accountModalOverlay.classList.remove('active');
        accountModal.classList.remove('active');
    }

    if (openAccountModalBtn) openAccountModalBtn.addEventListener('click', openAccountModal);
    if (closeAccountModalBtn) closeAccountModalBtn.addEventListener('click', closeAccountModal);
    if (accountModalOverlay) accountModalOverlay.addEventListener('click', closeAccountModal);

    function showModalAlert(msg, isError = true) {
        accountModalAlert.style.display = 'block';
        accountModalAlert.className = `auth-alert ${isError ? 'error' : 'success'}`;
        accountModalAlert.innerText = msg;
    }

    function clearModalAlert() {
        accountModalAlert.style.display = 'none';
        accountModalAlert.innerText = '';
    }

    // Password Change Submit
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearModalAlert();
            const current_password = document.getElementById('currentPasswordInput').value;
            const new_password = document.getElementById('newPasswordInput').value;

            try {
                const res = await fetch('/api/auth/account/password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ current_password, new_password })
                });
                const data = await res.json();
                if (res.ok) {
                    showModalAlert('Password updated successfully!', false);
                    changePasswordForm.reset();
                } else {
                    showModalAlert(data.error || 'Failed to update password.');
                }
            } catch (err) {
                showModalAlert('Connection error. Try again.');
            }
        });
    }

    // Delete Account Submit
    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearModalAlert();
            const password = document.getElementById('deleteConfirmPasswordInput').value;

            if (!confirm('Are you ABSOLUTELY SURE you want to delete your account? This action CANNOT be undone!')) {
                return;
            }

            try {
                const res = await fetch('/api/auth/account', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('Account deleted. Redirecting to sign in page...');
                    window.location.href = '/login';
                } else {
                    showModalAlert(data.error || 'Account deletion failed.');
                }
            } catch (err) {
                showModalAlert('Connection error. Try again.');
            }
        });
    }

    // Fetch Current User
    async function fetchUser() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                currentUser = await res.json();
                if (userName) userName.innerText = currentUser.username;
                if (dropdownUserName) dropdownUserName.innerText = currentUser.username;
                if (dropdownUserEmail) dropdownUserEmail.innerText = currentUser.email;
            } else if (res.status === 401) {
                window.location.href = '/login';
            }
        } catch (err) {
            console.error('Error fetching user profile:', err);
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
            } catch (err) {
                console.error('Error logging out:', err);
            }
        });
    }

    // Theme Management
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeBtnIcon(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeBtnIcon(newTheme);
    });

    function updateThemeBtnIcon(theme) {
        const themeIcon = themeToggleBtn.querySelector('.theme-icon');
        if (theme === 'dark') {
            themeIcon.innerText = '☼';
            themeToggleBtn.title = 'Switch to Light Mode';
        } else {
            themeIcon.innerText = '🌙';
            themeToggleBtn.title = 'Switch to Dark Mode';
        }
    }

    // API Calls
    async function fetchStats() {
        try {
            const res = await fetch('/api/stats');
            if (res.ok) {
                const stats = await res.json();
                if (statTotal) statTotal.innerText = stats.total;
                if (statDone) statDone.innerText = stats.done;
                if (statPending) statPending.innerText = stats.pending;
                if (completionPercent && completionBarFill) {
                    completionPercent.innerText = `${stats.completion_rate}%`;
                    completionBarFill.style.width = `${stats.completion_rate}%`;
                }
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    }

    async function fetchTasks() {
        try {
            const url = `/api/tasks?filter=${currentFilter}&search=${encodeURIComponent(currentSearch)}&sort=${currentSort}`;
            const res = await fetch(url);
            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }
            if (res.ok) {
                tasks = await res.json();
                renderTaskList();
                fetchStats();
            }
        } catch (err) {
            console.error('Error fetching tasks:', err);
        }
    }

    // Task Rendering
    function renderTaskList() {
        taskList.innerHTML = '';

        if (tasks.length === 0) {
            emptyView.style.display = 'block';
        } else {
            emptyView.style.display = 'none';
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-card ${task.completed ? 'is-completed' : ''}`;

                // Checkbox
                const checkbox = document.createElement('div');
                checkbox.className = 'checkbox-container';
                checkbox.innerHTML = '<span class="checkbox-check">✓</span>';
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleTaskCompleted(task.id, !task.completed);
                });

                // Task Body
                const taskBody = document.createElement('div');
                taskBody.className = 'task-body';

                const textSpan = document.createElement('span');
                textSpan.className = 'task-text';
                textSpan.innerText = task.content;
                taskBody.appendChild(textSpan);

                // Meta Pills
                const metaContainer = document.createElement('div');
                metaContainer.className = 'task-meta-pills';

                if (task.priority) {
                    const prioPill = document.createElement('span');
                    prioPill.className = `pill-priority ${task.priority}`;
                    prioPill.innerText = task.priority;
                    metaContainer.appendChild(prioPill);
                }

                if (task.due_date) {
                    const duePill = document.createElement('span');
                    duePill.className = 'pill-due';
                    duePill.innerText = `📅 ${task.due_date}`;
                    metaContainer.appendChild(duePill);
                }

                if (task.subtasks && task.subtasks.length > 0) {
                    const doneCount = task.subtasks.filter(st => st.completed).length;
                    const subPill = document.createElement('span');
                    subPill.className = 'pill-subtasks';
                    subPill.innerText = `📋 ${doneCount}/${task.subtasks.length}`;
                    metaContainer.appendChild(subPill);
                }

                if (metaContainer.children.length > 0) {
                    taskBody.appendChild(metaContainer);
                }

                // Star Button
                const starBtn = document.createElement('button');
                starBtn.className = `task-star-btn ${task.important ? 'active' : ''}`;
                starBtn.innerText = '★';
                starBtn.title = task.important ? 'Unstar' : 'Star';
                starBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleTaskImportant(task.id, !task.important);
                });

                li.appendChild(checkbox);
                li.appendChild(taskBody);
                li.appendChild(starBtn);

                // Open Drawer on Card Click
                li.addEventListener('click', () => {
                    openDrawer(task);
                });

                taskList.appendChild(li);
            });
        }
    }

    // Actions
    async function toggleTaskCompleted(taskId, completed) {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });
            if (res.ok) {
                if (activeTask && activeTask.id === taskId) {
                    activeTask.completed = completed;
                }
                fetchTasks();
            }
        } catch (err) {
            console.error('Error toggling completion:', err);
        }
    }

    async function toggleTaskImportant(taskId, important) {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ important })
            });
            if (res.ok) {
                if (activeTask && activeTask.id === taskId) {
                    activeTask.important = important;
                    updateDrawerStarBtn();
                }
                fetchTasks();
            }
        } catch (err) {
            console.error('Error toggling importance:', err);
        }
    }

    // Add Task Form Submit
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = taskContentInput.value.trim();
        if (!content) return;

        const newTask = {
            content,
            priority: currentPriority,
            due_date: taskDueDateInput.value || null
        };

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            if (res.ok) {
                taskContentInput.value = '';
                taskDueDateInput.value = '';
                fetchTasks();
            }
        } catch (err) {
            console.error('Error adding task:', err);
        }
    });

    // Search Input Debounce (if search input exists)
    if (searchInput) {
        let searchTimeout = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearch = searchInput.value.trim();
                fetchTasks();
            }, 300);
        });
    }

    // Drawer Logic
    function openDrawer(task) {
        activeTask = task;
        drawerTaskTitle.value = task.content;
        drawerPriority.value = task.priority || 'medium';
        drawerDueDate.value = task.due_date || '';
        drawerNotes.value = task.notes || '';
        drawerCreatedDate.innerText = `Created ${task.created_at || ''}`;

        updateDrawerStarBtn();
        renderSubtasks();

        drawerOverlay.classList.add('active');
        taskDrawer.classList.add('active');
    }

    function closeDrawer() {
        activeTask = null;
        drawerOverlay.classList.remove('active');
        taskDrawer.classList.remove('active');
    }

    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    function updateDrawerStarBtn() {
        if (!activeTask) return;
        if (activeTask.important) {
            drawerStarBtn.classList.add('active');
        } else {
            drawerStarBtn.classList.remove('active');
        }
    }

    drawerStarBtn.addEventListener('click', () => {
        if (!activeTask) return;
        toggleTaskImportant(activeTask.id, !activeTask.important);
    });

    // Update Task Fields from Drawer
    async function updateActiveTaskField(field, value) {
        if (!activeTask) return;
        activeTask[field] = value;
        try {
            await fetch(`/api/tasks/${activeTask.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
            fetchTasks();
        } catch (err) {
            console.error(`Error updating task ${field}:`, err);
        }
    }

    drawerTaskTitle.addEventListener('change', () => {
        if (drawerTaskTitle.value.trim()) {
            updateActiveTaskField('content', drawerTaskTitle.value.trim());
        }
    });

    drawerPriority.addEventListener('change', () => {
        updateActiveTaskField('priority', drawerPriority.value);
    });

    drawerDueDate.addEventListener('change', () => {
        updateActiveTaskField('due_date', drawerDueDate.value || null);
    });

    let notesTimeout = null;
    drawerNotes.addEventListener('input', () => {
        clearTimeout(notesTimeout);
        notesTimeout = setTimeout(() => {
            updateActiveTaskField('notes', drawerNotes.value);
        }, 500);
    });

    // Delete Task from Drawer
    drawerDeleteTaskBtn.addEventListener('click', async () => {
        if (!activeTask) return;
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                const res = await fetch(`/api/tasks/${activeTask.id}`, { method: 'DELETE' });
                if (res.ok) {
                    closeDrawer();
                    fetchTasks();
                }
            } catch (err) {
                console.error('Error deleting task:', err);
            }
        }
    });

    // Subtasks Render & Actions
    function renderSubtasks() {
        if (!activeTask) return;
        subtaskList.innerHTML = '';
        const subtasks = activeTask.subtasks || [];

        if (subtasks.length === 0) {
            subtaskProgressBar.style.display = 'none';
        } else {
            subtaskProgressBar.style.display = 'block';
            const completedCount = subtasks.filter(st => st.completed).length;
            const percentage = Math.round((completedCount / subtasks.length) * 100);
            subtaskProgressFill.style.width = `${percentage}%`;
        }

        subtasks.forEach(st => {
            const div = document.createElement('div');
            div.className = `subtask-item ${st.completed ? 'is-completed' : ''}`;

            const check = document.createElement('div');
            check.className = 'subtask-checkbox';
            check.innerText = st.completed ? '✓' : '';
            check.addEventListener('click', () => {
                toggleSubtaskCompleted(st.id, !st.completed);
            });

            const text = document.createElement('span');
            text.className = 'subtask-text';
            text.innerText = st.content;

            const delBtn = document.createElement('button');
            delBtn.className = 'subtask-delete-btn';
            delBtn.innerText = '✕';
            delBtn.addEventListener('click', () => {
                deleteSubtask(st.id);
            });

            div.appendChild(check);
            div.appendChild(text);
            div.appendChild(delBtn);
            subtaskList.appendChild(div);
        });
    }

    addSubtaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeTask) return;
        const content = subtaskInput.value.trim();
        if (!content) return;

        try {
            const res = await fetch(`/api/tasks/${activeTask.id}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                subtaskInput.value = '';
                const newSub = await res.json();
                if (!activeTask.subtasks) activeTask.subtasks = [];
                activeTask.subtasks.push(newSub);
                renderSubtasks();
                fetchTasks();
            }
        } catch (err) {
            console.error('Error adding subtask:', err);
        }
    });

    async function toggleSubtaskCompleted(subtaskId, completed) {
        try {
            const res = await fetch(`/api/subtasks/${subtaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });
            if (res.ok) {
                const sub = activeTask.subtasks.find(s => s.id === subtaskId);
                if (sub) sub.completed = completed;
                renderSubtasks();
                fetchTasks();
            }
        } catch (err) {
            console.error('Error toggling subtask:', err);
        }
    }

    async function deleteSubtask(subtaskId) {
        try {
            const res = await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
            if (res.ok) {
                activeTask.subtasks = activeTask.subtasks.filter(s => s.id !== subtaskId);
                renderSubtasks();
                fetchTasks();
            }
        } catch (err) {
            console.error('Error deleting subtask:', err);
        }
    }

    // Initial Load
    fetchUser();
    fetchTasks();
});
