# DDR LMS Backend API

REST API for **DDR LMS**, a simple Learning Management System built with Express, TypeScript, MongoDB, and Mongoose.

The API handles authentication, authorization, course management, modules, lessons, enrollments, user profiles, and lesson progress.

## Tech Stack

* Node.js
* Express
* TypeScript
* MongoDB Atlas
* Mongoose
* Zod
* HTTP-only session cookies
* Google Gmail API

---

## Base URL

### Development

```text
http://localhost:4000/api/v0
```

### Production

```text
https://your-backend.com/api/v0
```

---

# Complete Endpoint Reference

| Method     | Endpoint                                                 | Auth | Role                 | Description                      |
| ---------- | -------------------------------------------------------- | ---- | -------------------- | -------------------------------- |
| **POST**   | `/auth/register`                                         | No   | —                    | Register a new user              |
| **GET**    | `/auth/register/verify/:id`                              | No   | —                    | Verify user email                |
| **POST**   | `/auth/login`                                            | No   | —                    | Log in and create a session      |
| **POST**   | `/auth/logout`                                           | No   | —                    | Log out and clear session        |
| **POST**   | `/auth/login/fp`                                         | No   | —                    | Methods to reset password        |
| **GET**    | `/auth/login/fp/reset/:id`                               | No   | —                    | Verify reset password link       |
| **POST**   | `/auth/login/fp/reset/otp-verify`                        | No   | —                    | Verify reset password OTP        |
| **POST**   | `/auth/login/fp/reset/setup/:id`                         | No   | —                    | Set new password                 |
| **GET**    | `/auth/profile`                                          | Yes  | Any                  | Get current authenticated user   |
| **PATCH**  | `/auth/profile/update`                                   | Yes  | Any                  | Update current user's profile    |
| **GET**    | `/auth/get-regions`                                      | No   | —                    | List of dial codes & regions     |
|            |                                                          |      |                      |                                  |
| **GET**    | `/courses`                                               | No   | —                    | Browse published courses         |
| **GET**    | `/courses/:id`                                           | No   | —                    | Get course details               |
| **GET**    | `/courses/my-courses`                                    | Yes  | Instructor / Student | Get user's made/enrolled courses |
| **GET**    | `/courses/my-courses/:id`                                | Yes  | Instructor           | Get user's made/enrolled course  |
| **POST**   | `/courses/my-courses/new-course`                         | Yes  | Instructor           | Make a course                    |
| **PATCH**  | `/courses/my-courses/:id/update-course`                  | Yes  | Instructor           | Update own course                |
| **DELETE** | `/courses/my-courses/:id/delete-course`                  | Yes  | Instructor           | Delete own course                |
| **PATCH**  | `/courses/my-courses/:id/publish`                        | Yes  | Instructor           | Publish own course               |
|            |                                                          |      |                      |                                  |
| **POST**   | `/courses/:cid/modules`                                  | Yes  | Instructor / Student | Get course modules               |
| **POST**   | `/courses/:cid/modules/new-module`                       | Yes  | Instructor           | Add a module                     |
| **PATCH**  | `/courses/:cid/modules/:id/update-module`                | Yes  | Instructor           | Update a module                  |
| **DELETE** | `/courses/:cid/modules/:id/delete-module`                | Yes  | Instructor           | Delete a module                  |
|            |                                                          |      |                      |                                  |
| **GET**    | `/courses/:cid/modules/:mid/lessons`                     | Yes  | Instructor / Student | Get module lessons               |
| **POST**   | `/courses/:cid/modules/:mid/lessons/new-lesson`          | Yes  | Instructor           | Add a lesson                     |
| **PATCH**  | `/courses/:cid/modules/:mid/lessons/:lid/update-lesson`  | Yes  | Instructor           | Update a lesson                  |
| **DELETE** | `/courses/:cid/modules/:mid/lessons/:lid/delete-lesson`  | Yes  | Instructor           | Delete a lesson                  |
|            |                                                          |      |                      |                                  |
| **POST**   | `/courses/:id/enroll`                                    | Yes  | Student              | Enroll in a published course     |
| **POST**   | `/courses/:id/unenroll`                                  | Yes  | Student              | Un-enroll from a course          |
|            |                                                          |      |                      |                                  |
| **POST**   | `/courses/:cid/modules/:mid/lessons/:lid/complete`       | Yes  | Student              | Toggle lesson completion         |

### Authentication Legend

| Value          | Meaning                         |
| -------------- | ------------------------------- |
| **No**         | Endpoint is publicly accessible |
| **Yes**        | Valid session required          |
| **Any**        | Any authenticated user          |
| **Student**    | Student role required           |
| **Instructor** | Instructor role required        |

---

# Authentication

This LMS uses **session-based authentication** with HTTP-only cookies.

After a successful login, the API sets a `sessionToken` cookie. This cookie is automatically used to authenticate subsequent requests.

Protected endpoints require:

* A valid session
* An active user account
* A verified email address

### Roles

```text
student
instructor
admin (un-implemented)
```

---

## Authentication Endpoints

### Register

```http
POST /auth/register
```

Creates a new user account.

#### Request

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student"
}
```

---

### Verify Email

```http
GET /auth/register/verify/:id
```

Verifies a user's email address using the verification id/token.

---

### Login

```http
POST /auth/login
```

Authenticates a user and adds a session.

#### Request

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

A successful login sets the `sessionToken` HTTP-only cookie.

---

### Logout

```http
POST /auth/logout
```

Logs out the current user and clears the session cookie.

This endpoint does not require authentication so that expired or invalid sessions can still be cleared.

---

### Get Current User

```http
GET /auth/profile
```

**Authentication required**

Returns the currently authenticated user.

---

### Update Profile

```http
PATCH /auth/profile/update
```

**Authentication required**

Updates the authenticated user's profile.

#### Request

```json
{
  "name": "John Doe",
  "address": "New York"
}
```

Email changes are not currently supported.

---

# Courses

### Create Course

```http
POST /courses/my-courses/new-course
```

**Instructor only**

Creates a new course as a draft.

#### Request

```json
{
  "title": "React Beginners",
  "description": "Learn the fundamentals of React.",
  "thumbnail": "https://example.com/image.jpg"
}
```

---

### Get Courses

```http
GET /courses
```

Returns published courses.

#### Query Parameters

| Parameter | Description              | Example  |
| --------- | ------------------------ | -------- |
| `search`  | Search title/description | `react`  |
| `sort`    | Sorting method           | `newest` |
| `page`    | Page number              | `1`      |
| `limit`   | Results per page         | `12`     |

Sort options:

```text
newest
oldest
title_asc
title_desc
```

---

### Get Course

```http
GET /courses/:id
```

Returns course details.

---

### Get My Courses

```http
GET /courses/my-courses
```

**Instructor**

Returns courses created by the authenticated instructor.

Supports:

```text
search
sort
status
page
limit
```

Status options:

```text
draft
published
```

**Student**

Returns published courses enrolled into by the authenticated student.

Supports:

```text
search
sort
page
limit
```

---

### Update Course

```http
PATCH /courses/my-courses/:id/update-course
```

**Instructor owner only**

Updates course information.

---

### Delete Course

```http
DELETE /courses/my-courses/:id/delete-course
```

**Instructor owner only**

Deletes a course and its associated modules, lessons, enrollments, and progress records.

---

### Publish Course

```http
PATCH /courses/my-courses/:id/publish
```

**Instructor owner only**

Publishes a course (Note: A course cannot be unpublished once it has been published).

A course must contain:

* At least one module
* At least one lesson in every module

---

# Modules

### Create Module

```http
POST /courses/:cid/modules/new-module
```

**Instructor owner only**

#### Request

```json
{
  "title": "Introduction to React",
  "description": "React fundamentals."
}
```

---

### Update Module

```http
PATCH /courses/:cid/modules/:id/update-module
```

**Instructor owner only**

Updates a module.

---

### Delete Module

```http
DELETE /courses/:cid/modules/:id/delete-module
```

**Instructor owner only**

Deletes a module and its associated lessons.

---

# Lessons

### Create Lesson

```http
POST /courses/:cid/modules/:mid/lessons/new-lesson
```

**Instructor owner only**

#### Request

```json
{
  "title": "What is the DOM?",
  "description": "An introduction to the Document Object Model.",
  "videoUrl": "https://www.youtube.com/watch?v=example",
  "duration": 10
  "order": 2
}
```

---

### Get Lessons

```http
GET /courses/:cid/modules/:mid/lessons
```

Returns the lessons belonging to a module.

---

### Update Lesson

```http
PATCH /courses/:cid/modules/:mid/lessons/:lid/update-lesson
```

**Instructor owner only**

Updates lesson information.

---

### Delete Lesson

```http
DELETE /courses/:cid/modules/:mid/lessons/:lid/delete-lesson
```

**Instructor owner only**

Deletes a lesson.

---

# Enrollments

### Enroll in Course

```http
POST /courses/:id/enroll
```

**Student only**

Enrolls the authenticated student in a published course.

Students cannot enroll in draft courses or in the same course more than once.

---

### Get Enrolled Course

```http
GET /courses/my-courses/:id
```

**Student**

Returns the course structure for the student's learning experience, including modules, lessons, completion state, and overall progress.

**Instructor owner**

Returns the course management page with options to edit and preview.

---

# Lesson Progress

### Toggle Lesson Completion

```http
POST /courses/:cid/modules/:mid/lessons/:lid/complete
```

**Student only**

Toggles the completion state of a lesson.

```text
Incomplete → Complete
Complete → Incomplete
```

Course progress is calculated as:

```text
completed lessons / total lessons × 100
```

---

# Response Format

Successful responses generally follow:

```json
{
  "success": true,
  "message": "Request successful.",
  "data": {} | [{},]
}
```

Errors generally follow:

```json
{
  "success": false,
  "message": "Something went wrong."
}
```

Validation errors may include:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address."
    }
  ]
}
```

---

# HTTP Status Codes

| Status | Meaning                            |
| -----: | ---------------------------------- |
|  `200` | Successful request                 |
|  `201` | Resource created                   |
|  `251` | Lesson marked Incomplete           |
|  `400` | Invalid request / validation error |
|  `401` | Authentication required            |
|  `403` | Insufficient permissions           |
|  `404` | Resource not found                 |
|  `409` | Duplicate or conflicting resource  |
|  `500` | Internal server error              |

---

# Database Models

The API uses MongoDB Atlas with the following main models:

```text
User
Session
Course
Module
Lesson
Enrollment
Progress
```

Core relationships:

```text
User
 ├── Course
 ├── Enrollment
 └── Progress

Course
 ├── Module
 ├── Enrollment
 └── Progress

Module
 └── Lesson
```

---

# Environment Variables

Make a `.env` file in the backend root and follow .env.sample to set the variables.

---

# Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:4000
```

API endpoints are available under:

```text
http://localhost:4000/api/v0
```

The API can be tested using tools such as **httpyac** and **Postman**. The .http files in this repository are sample api testing files for **httpyac** that were used during development.

---

# Deployment

The production backend is deployed on Render and uses MongoDB Atlas as its database.

```text
Netlify
   │
   │ API requests
   ▼
Render API
   │
   │ Mongoose
   ▼
MongoDB Atlas
```

The backend uses CORS to allow requests from the configured frontend origin and HTTP-only cookies for session authentication.

---

## Project Scope

The API intentionally focuses on the core LMS workflow.

The following features are outside the current scope:

* Payments
* Quizzes
* Assignments
* Certificates
* Notifications
* Advanced analytics
* Full administrative dashboard functionality
