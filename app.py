import os
import json
from datetime import datetime
from functools import wraps
from typing import Dict, Any, List
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# Application Configuration
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SECRET_KEY'] = 'taskmanager-secret-key-2026-secure'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.String(50), default=lambda: datetime.now().strftime("%b %d, %Y"))

    tasks = db.relationship('Task', backref='user', cascade='all, delete-orphan', lazy=True)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at
        }

class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    content = db.Column(db.String(255), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    important = db.Column(db.Boolean, default=False)
    category = db.Column(db.String(50), default='my_day')  # my_day, work, personal, planned, etc.
    priority = db.Column(db.String(20), default='normal')  # low, normal, high
    due_date = db.Column(db.String(50), nullable=True)     # YYYY-MM-DD
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.String(50), default=lambda: datetime.now().strftime("%b %d, %H:%M"))

    subtasks = db.relationship('Subtask', backref='task', cascade='all, delete-orphan', lazy=True)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'content': self.content,
            'completed': self.completed,
            'important': self.important,
            'category': self.category,
            'priority': self.priority,
            'due_date': self.due_date,
            'notes': self.notes or '',
            'created_at': self.created_at,
            'subtasks': [st.to_dict() for st in self.subtasks]
        }

class Subtask(db.Model):
    __tablename__ = 'subtasks'

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    content = db.Column(db.String(255), nullable=False)
    completed = db.Column(db.Boolean, default=False)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'task_id': self.task_id,
            'content': self.content,
            'completed': self.completed
        }

# Auth Decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized'}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

def get_current_user_id() -> int:
    return session.get('user_id')

def init_db():
    with app.app_context():
        db.create_all()
        try:
            with db.engine.connect() as conn:
                result = conn.execute(db.text("PRAGMA table_info(tasks)")).fetchall()
                columns = [row[1] for row in result]
                if 'user_id' not in columns:
                    conn.execute(db.text("ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                    conn.commit()
        except Exception as e:
            print(f"Migration error: {e}")

# Auth Routes
@app.route('/login', methods=['GET'])
def login_page():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required.'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username is already taken.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email is already registered.'}), 400

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Log in user
    session['user_id'] = user.id
    return jsonify({'message': 'Registration successful', 'user': user.to_dict()}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username_or_email = data.get('username', '').strip()
    password = data.get('password', '')

    if not username_or_email or not password:
        return jsonify({'error': 'Please provide username/email and password.'}), 400

    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email.lower())
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username/email or password.'}), 401

    session['user_id'] = user.id
    return jsonify({'message': 'Login successful', 'user': user.to_dict()})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_me():
    user = db.get_or_404(User, get_current_user_id())
    return jsonify(user.to_dict())

@app.route('/api/auth/account', methods=['DELETE'])
@login_required
def delete_account():
    user_id = get_current_user_id()
    user = db.get_or_404(User, user_id)
    data = request.get_json() or {}
    password = data.get('password', '')

    if not password or not user.check_password(password):
        return jsonify({'error': 'Incorrect password. Account deletion canceled.'}), 400

    db.session.delete(user)
    db.session.commit()
    session.pop('user_id', None)
    return jsonify({'success': True, 'message': 'Account deleted successfully'})

@app.route('/api/auth/account/password', methods=['PUT'])
@login_required
def change_password():
    user_id = get_current_user_id()
    user = db.get_or_404(User, user_id)
    data = request.get_json() or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not user.check_password(current_password):
        return jsonify({'error': 'Incorrect current password.'}), 400

    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters.'}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Password updated successfully'})

# Main View Route
@app.route('/')
@login_required
def index():
    return render_template('index.html')

# REST API Routes
@app.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    user_id = get_current_user_id()
    filter_by = request.args.get('filter', 'all')  # all, active, done, high_priority
    category = request.args.get('category', '')
    search_query = request.args.get('search', '').lower()
    sort_by = request.args.get('sort', 'created_at')  # created_at, priority, due_date, content
    
    query = Task.query.filter_by(user_id=user_id)

    if filter_by == 'active':
        query = query.filter_by(completed=False)
    elif filter_by == 'done':
        query = query.filter_by(completed=True)
    elif filter_by == 'high_priority':
        query = query.filter_by(priority='high')
    
    if category:
        query = query.filter_by(category=category)

    tasks = query.all()

    if search_query:
        tasks = [t for t in tasks if search_query in t.content.lower()]

    # Sorting
    if sort_by == 'priority':
        priority_order = {'high': 0, 'normal': 1, 'medium': 1, 'low': 2}
        tasks.sort(key=lambda t: priority_order.get(t.priority, 1))
    elif sort_by == 'due_date':
        tasks.sort(key=lambda t: t.due_date or '9999-99-99')
    elif sort_by == 'content':
        tasks.sort(key=lambda t: t.content.lower())
    elif sort_by == 'oldest':
        tasks.sort(key=lambda t: t.id)
    else:
        # Default: newest first
        tasks.sort(key=lambda t: t.id, reverse=True)

    return jsonify([t.to_dict() for t in tasks])

@app.route('/api/tasks', methods=['POST'])
@login_required
def create_task():
    user_id = get_current_user_id()
    data = request.get_json() or {}
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Task content cannot be empty'}), 400

    new_task = Task(
        user_id=user_id,
        content=content,
        category=data.get('category', 'my_day'),
        priority=data.get('priority', 'medium'),
        due_date=data.get('due_date'),
        notes=data.get('notes', ''),
        important=data.get('important', False)
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/api/tasks/<int:task_id>', methods=['GET'])
@login_required
def get_task_detail(task_id: int):
    user_id = get_current_user_id()
    task = db.get_or_404(Task, task_id)
    if task.user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403
    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id: int):
    user_id = get_current_user_id()
    task = db.get_or_404(Task, task_id)
    if task.user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json() or {}

    if 'content' in data:
        task.content = data['content'].strip()
    if 'completed' in data:
        task.completed = bool(data['completed'])
    if 'important' in data:
        task.important = bool(data['important'])
    if 'category' in data:
        task.category = data['category']
    if 'priority' in data:
        task.priority = data['priority']
    if 'due_date' in data:
        task.due_date = data['due_date']
    if 'notes' in data:
        task.notes = data['notes']

    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id: int):
    user_id = get_current_user_id()
    task = db.get_or_404(Task, task_id)
    if task.user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True, 'id': task_id})

# Subtask Endpoints
@app.route('/api/tasks/<int:task_id>/subtasks', methods=['POST'])
@login_required
def add_subtask(task_id: int):
    user_id = get_current_user_id()
    task = db.get_or_404(Task, task_id)
    if task.user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Subtask content required'}), 400

    subtask = Subtask(task_id=task.id, content=content)
    db.session.add(subtask)
    db.session.commit()
    return jsonify(subtask.to_dict()), 201

@app.route('/api/subtasks/<int:subtask_id>', methods=['PUT'])
@login_required
def update_subtask(subtask_id: int):
    user_id = get_current_user_id()
    subtask = db.get_or_404(Subtask, subtask_id)
    if subtask.task.user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    if 'completed' in data:
        subtask.completed = bool(data['completed'])
    if 'content' in data:
        subtask.content = data['content'].strip()

    db.session.commit()
    return jsonify(subtask.to_dict())

@app.route('/api/subtasks/<int:subtask_id>', methods=['DELETE'])
@login_required
def delete_subtask(subtask_id: int):
    user_id = get_current_user_id()
    subtask = db.get_or_404(Subtask, subtask_id)
    if subtask.task.user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    db.session.delete(subtask)
    db.session.commit()
    return jsonify({'success': True, 'id': subtask_id})

# Statistics / Stat Cards
@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    user_id = get_current_user_id()
    total_user_tasks = Task.query.filter_by(user_id=user_id).count()
    done_user_tasks = Task.query.filter_by(user_id=user_id, completed=True).count()
    pending_user_tasks = Task.query.filter_by(user_id=user_id, completed=False).count()
    completion_rate = int((done_user_tasks / total_user_tasks) * 100) if total_user_tasks > 0 else 0

    return jsonify({
        'total': total_user_tasks,
        'done': done_user_tasks,
        'pending': pending_user_tasks,
        'completion_rate': completion_rate
    })

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)