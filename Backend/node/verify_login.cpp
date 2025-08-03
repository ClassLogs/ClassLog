#include <iostream>
#include <string>
using namespace std;

int main(int argc, char* argv[]) {
    if (argc != 4) {
        cout << "invalid_args" << endl;
        return 1;
    }

    string role = argv[1];
    string emailOrId = argv[2];
    string password = argv[3];

    if (role == "teacher") {
        if (emailOrId == "teacher@school.edu" && password == "password123") {
            // Output format: teacher_success|T001|John Doe
            cout << "teacher_success|T001|John Doe" << endl;
        } else {
            cout << "teacher_failure" << endl;
        }
    } else if (role == "student") {
        if (emailOrId == "STU001" && password == "student123") {
            // Output format: student_success|STU001|Alice Johnson
            cout << "student_success|STU001|Alice Johnson" << endl;
        } else {
            cout << "student_failure" << endl;
        }
    } else {
        cout << "invalid_role" << endl;
    }

    return 0;
}
