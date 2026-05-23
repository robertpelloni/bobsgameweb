#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>

class QTabWidget;

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private:
    void setupUi();
    void syncUIFromState(); // Ultimate++ concept mapping

    QTabWidget *tabWidget;
};

#endif // MAINWINDOW_H