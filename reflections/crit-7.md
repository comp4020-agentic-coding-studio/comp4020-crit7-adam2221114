# Crit 7 Reflection

## 1. What was the breakthrough that moved the work forward?

The biggest breakthrough was realising that the planner should not just be a simple course list with Add and Remove buttons. It became much more useful once I started modelling the real planning logic behind ANU courses.

At first, the catalogue used simple representative course data. After checking the official ANU Programs & Courses pages, I replaced it with real 2026 Master of Computing course data and added prerequisite relationships. This also exposed problems in the earlier assumptions, such as confusing COMP7710 and COMP6710. Cross-checking the individual course pages helped me correct those mistakes.

Another important step was making the course cards state-driven. Instead of letting the user click Add and only then showing an error, the interface now explains whether a course can be added to a semester and why. This made the planner feel more like a real decision-support tool.

## 2. What did this work change about who I want to be as a software developer?

This project changed how I think about building with AI. I do not want to accept code or data just because it looks plausible. I want to verify important assumptions, use reliable sources, and keep the scope small enough that I can understand the system.

I also learned that good software is not only about making features work. The data model, user feedback, persistence, testing, and interaction design all need to support the same user goal.