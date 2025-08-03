#include <iostream>
#include <fstream>
using namespace std;

int main() {
    string name, roll, dept;

    cout << "Enter Name: ";
    getline(cin, name);

    cout << "Enter Roll Number: ";
    getline(cin, roll);

    cout << "Enter Department: ";
    getline(cin, dept);

    ofstream out("../data/student.txt");
    out << name << "," << roll << "," << dept;
    out.close();

    cout << "✅ Data written to student.txt\n";
    return 0;
}
