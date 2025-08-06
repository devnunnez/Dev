#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for AI Code Generator
Tests all endpoints: health check, code generation, preview, conversations, templates
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = "https://3fdf5759-7efc-480c-b7fb-28f7f5de839d.preview.emergentagent.com/api"

class AICodeGeneratorAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.session = requests.Session()
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
        print()

    def test_health_check(self):
        """Test GET /api/ - Basic health check"""
        print("🔍 Testing Health Check Endpoint (GET /api/)")
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ['message', 'status', 'services']
                
                if all(field in data for field in expected_fields):
                    if data['status'] == 'running' and 'OpenAI GPT-4' in data['services']:
                        self.log_test(
                            "Health Check Endpoint",
                            True,
                            "Health check endpoint working correctly",
                            {'response': data, 'status_code': response.status_code}
                        )
                        return True
                    else:
                        self.log_test(
                            "Health Check Endpoint",
                            False,
                            "Health check response missing expected status or services",
                            {'response': data}
                        )
                else:
                    self.log_test(
                        "Health Check Endpoint",
                        False,
                        "Health check response missing required fields",
                        {'response': data, 'expected': expected_fields}
                    )
            else:
                self.log_test(
                    "Health Check Endpoint",
                    False,
                    f"Health check returned status code {response.status_code}",
                    {'status_code': response.status_code, 'response': response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Health Check Endpoint",
                False,
                f"Health check failed with exception: {str(e)}",
                {'exception': str(e)}
            )
        
        return False

    def test_code_generation(self):
        """Test POST /api/generate - Main code generation endpoint"""
        print("🔍 Testing Code Generation Endpoint (POST /api/generate)")
        
        # Test cases for different project types and prompts
        test_cases = [
            {
                'name': 'Component Generation',
                'payload': {
                    'message': 'Create a simple todo component with add, delete, and toggle functionality',
                    'projectType': 'component'
                }
            },
            {
                'name': 'Frontend Dashboard',
                'payload': {
                    'message': 'Build a dashboard with charts and user analytics',
                    'projectType': 'frontend'
                }
            },
            {
                'name': 'Backend API',
                'payload': {
                    'message': 'Create a REST API for user management',
                    'projectType': 'backend'
                }
            },
            {
                'name': 'Fullstack App',
                'payload': {
                    'message': 'Build a complete blog application',
                    'projectType': 'fullstack'
                }
            }
        ]
        
        success_count = 0
        
        for test_case in test_cases:
            try:
                print(f"  Testing: {test_case['name']}")
                response = self.session.post(
                    f"{self.base_url}/generate",
                    json=test_case['payload'],
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    expected_fields = ['success', 'explanation', 'code']
                    
                    if all(field in data for field in expected_fields):
                        if data['success'] and data['explanation'] and data['code']:
                            self.log_test(
                                f"Code Generation - {test_case['name']}",
                                True,
                                "Code generation successful with valid response",
                                {
                                    'project_type': test_case['payload']['projectType'],
                                    'has_explanation': bool(data['explanation']),
                                    'has_code': bool(data['code']),
                                    'model': data.get('model', 'unknown')
                                }
                            )
                            success_count += 1
                        else:
                            self.log_test(
                                f"Code Generation - {test_case['name']}",
                                False,
                                "Code generation response missing content",
                                {'response': data}
                            )
                    else:
                        self.log_test(
                            f"Code Generation - {test_case['name']}",
                            False,
                            "Code generation response missing required fields",
                            {'response': data, 'expected': expected_fields}
                        )
                else:
                    self.log_test(
                        f"Code Generation - {test_case['name']}",
                        False,
                        f"Code generation returned status code {response.status_code}",
                        {'status_code': response.status_code, 'response': response.text}
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Code Generation - {test_case['name']}",
                    False,
                    f"Code generation failed with exception: {str(e)}",
                    {'exception': str(e)}
                )
            
            # Small delay between requests
            time.sleep(1)
        
        # Test error handling - missing message
        try:
            print("  Testing: Error Handling - Missing Message")
            response = self.session.post(
                f"{self.base_url}/generate",
                json={'projectType': 'component'},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'required' in data['error'].lower():
                    self.log_test(
                        "Code Generation - Error Handling",
                        True,
                        "Proper error handling for missing message parameter",
                        {'error_response': data}
                    )
                    success_count += 1
                else:
                    self.log_test(
                        "Code Generation - Error Handling",
                        False,
                        "Error response format incorrect",
                        {'response': data}
                    )
            else:
                self.log_test(
                    "Code Generation - Error Handling",
                    False,
                    f"Expected 400 status code for missing message, got {response.status_code}",
                    {'status_code': response.status_code}
                )
                
        except Exception as e:
            self.log_test(
                "Code Generation - Error Handling",
                False,
                f"Error handling test failed: {str(e)}",
                {'exception': str(e)}
            )
        
        return success_count >= 4  # At least 4 out of 5 tests should pass

    def test_preview_generation(self):
        """Test POST /api/preview - Code preview generation"""
        print("🔍 Testing Code Preview Endpoint (POST /api/preview)")
        
        test_code = """
import React, { useState } from 'react';

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
      setInput('');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Todo App</h1>
      <div className="mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border p-2 mr-2"
          placeholder="Add a todo..."
        />
        <button onClick={addTodo} className="bg-blue-500 text-white p-2 rounded">
          Add Todo
        </button>
      </div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className="mb-2">
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoApp;
        """
        
        try:
            response = self.session.post(
                f"{self.base_url}/preview",
                json={'code': test_code},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ['success', 'previewUrl', 'previewId']
                
                if all(field in data for field in expected_fields):
                    if data['success'] and data['previewUrl'] and data['previewId']:
                        self.log_test(
                            "Code Preview Generation",
                            True,
                            "Preview generation successful with valid response",
                            {
                                'preview_url': data['previewUrl'],
                                'preview_id': data['previewId'],
                                'success': data['success']
                            }
                        )
                        return True
                    else:
                        self.log_test(
                            "Code Preview Generation",
                            False,
                            "Preview response missing content",
                            {'response': data}
                        )
                else:
                    self.log_test(
                        "Code Preview Generation",
                        False,
                        "Preview response missing required fields",
                        {'response': data, 'expected': expected_fields}
                    )
            else:
                self.log_test(
                    "Code Preview Generation",
                    False,
                    f"Preview generation returned status code {response.status_code}",
                    {'status_code': response.status_code, 'response': response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Code Preview Generation",
                False,
                f"Preview generation failed with exception: {str(e)}",
                {'exception': str(e)}
            )
        
        # Test error handling - missing code
        try:
            print("  Testing: Error Handling - Missing Code")
            response = self.session.post(
                f"{self.base_url}/preview",
                json={},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'required' in data['error'].lower():
                    self.log_test(
                        "Code Preview - Error Handling",
                        True,
                        "Proper error handling for missing code parameter",
                        {'error_response': data}
                    )
                else:
                    self.log_test(
                        "Code Preview - Error Handling",
                        False,
                        "Error response format incorrect",
                        {'response': data}
                    )
            else:
                self.log_test(
                    "Code Preview - Error Handling",
                    False,
                    f"Expected 400 status code for missing code, got {response.status_code}",
                    {'status_code': response.status_code}
                )
                
        except Exception as e:
            self.log_test(
                "Code Preview - Error Handling",
                False,
                f"Preview error handling test failed: {str(e)}",
                {'exception': str(e)}
            )
        
        return False

    def test_conversations_history(self):
        """Test GET /api/conversations - Conversation history"""
        print("🔍 Testing Conversations History Endpoint (GET /api/conversations)")
        
        try:
            response = self.session.get(f"{self.base_url}/conversations")
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    # Check if conversations have expected structure
                    if len(data) > 0:
                        sample_conversation = data[0]
                        expected_fields = ['id', 'message', 'projectType', 'result', 'timestamp']
                        
                        if all(field in sample_conversation for field in expected_fields):
                            self.log_test(
                                "Conversations History",
                                True,
                                f"Conversations retrieved successfully with {len(data)} conversations",
                                {
                                    'conversation_count': len(data),
                                    'sample_structure': list(sample_conversation.keys()),
                                    'has_mongodb_id': '_id' not in sample_conversation  # Should be cleaned
                                }
                            )
                            return True
                        else:
                            self.log_test(
                                "Conversations History",
                                False,
                                "Conversation structure missing required fields",
                                {'sample': sample_conversation, 'expected': expected_fields}
                            )
                    else:
                        self.log_test(
                            "Conversations History",
                            True,
                            "Conversations endpoint working but no conversations found (empty database)",
                            {'conversation_count': 0}
                        )
                        return True
                else:
                    self.log_test(
                        "Conversations History",
                        False,
                        "Conversations response is not a list",
                        {'response_type': type(data).__name__, 'response': data}
                    )
            else:
                self.log_test(
                    "Conversations History",
                    False,
                    f"Conversations endpoint returned status code {response.status_code}",
                    {'status_code': response.status_code, 'response': response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Conversations History",
                False,
                f"Conversations history failed with exception: {str(e)}",
                {'exception': str(e)}
            )
        
        return False

    def test_templates(self):
        """Test GET /api/templates - Available templates"""
        print("🔍 Testing Templates Endpoint (GET /api/templates)")
        
        try:
            response = self.session.get(f"{self.base_url}/templates")
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list) and len(data) > 0:
                    # Check template structure
                    sample_template = data[0]
                    expected_fields = ['id', 'name', 'description', 'type', 'tags']
                    
                    if all(field in sample_template for field in expected_fields):
                        # Verify expected templates exist
                        template_ids = [t['id'] for t in data]
                        expected_templates = ['todo-app', 'dashboard', 'landing-page', 'chat-app', 'blog-platform']
                        
                        if all(template_id in template_ids for template_id in expected_templates):
                            self.log_test(
                                "Templates Endpoint",
                                True,
                                f"Templates retrieved successfully with {len(data)} templates",
                                {
                                    'template_count': len(data),
                                    'template_ids': template_ids,
                                    'sample_structure': list(sample_template.keys())
                                }
                            )
                            return True
                        else:
                            self.log_test(
                                "Templates Endpoint",
                                False,
                                "Missing expected templates",
                                {'found': template_ids, 'expected': expected_templates}
                            )
                    else:
                        self.log_test(
                            "Templates Endpoint",
                            False,
                            "Template structure missing required fields",
                            {'sample': sample_template, 'expected': expected_fields}
                        )
                else:
                    self.log_test(
                        "Templates Endpoint",
                        False,
                        "Templates response is not a valid list or is empty",
                        {'response_type': type(data).__name__, 'length': len(data) if isinstance(data, list) else 'N/A'}
                    )
            else:
                self.log_test(
                    "Templates Endpoint",
                    False,
                    f"Templates endpoint returned status code {response.status_code}",
                    {'status_code': response.status_code, 'response': response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Templates Endpoint",
                False,
                f"Templates endpoint failed with exception: {str(e)}",
                {'exception': str(e)}
            )
        
        return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting AI Code Generator Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 80)
        
        # Run all tests
        test_results = {
            'health_check': self.test_health_check(),
            'code_generation': self.test_code_generation(),
            'preview_generation': self.test_preview_generation(),
            'conversations_history': self.test_conversations_history(),
            'templates': self.test_templates()
        }
        
        # Summary
        print("=" * 80)
        print("🏁 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(test_results.values())
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status}: {test_name.replace('_', ' ').title()}")
        
        print(f"\nOverall Result: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All backend API tests passed successfully!")
        else:
            print(f"⚠️  {total - passed} test(s) failed. Check details above.")
        
        return test_results

if __name__ == "__main__":
    tester = AICodeGeneratorAPITester()
    results = tester.run_all_tests()