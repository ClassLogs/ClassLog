#include <iostream>
#include <fstream>
#include <string>
using namespace std;

int main() {
    ifstream file("data/student.txt");
    string name, roll, dept;

    if (file >> name >> roll >> dept) {
        cout << name << "," << roll << "," << dept;
    } else {
        cerr << "Invalid input";
    }

    return 0;
}
