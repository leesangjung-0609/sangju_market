from flask import Flask, request, send_file, render_template
import mysql.connector
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import json

app = Flask(__name__)

DB_CONFIG = {
    "host": "155.230.241.241",
    "user": "team3_nam",
    "password": "team3_nam##",
    "database": "univ_db_team3"
}

# ----------------------------
# DB 조회 함수
# ----------------------------
def get_sections():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    query = """
        SELECT 
            s.course_id,
            c.title,
            s.sec_id,
            s.semester,
            s.year,
            c.credits,
            i.name AS instructor_name
        FROM section s
        JOIN course c ON s.course_id = c.course_id
        LEFT JOIN teaches t 
            ON s.course_id = t.course_id 
            AND s.sec_id = t.sec_id 
            AND s.semester = t.semester 
            AND s.year = t.year
        LEFT JOIN instructor i 
            ON t.ID = i.ID
        ORDER BY c.title, s.year DESC, s.semester DESC, s.sec_id ASC
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def get_students(course_id, sec_id, semester, year):
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    query = """
        SELECT s.id, s.name, s.dept_name
        FROM takes t
        JOIN student s ON t.id = s.id
        WHERE t.course_id = %s AND t.sec_id = %s AND t.semester = %s AND t.year = %s
        ORDER BY s.id
    """
    cursor.execute(query, (course_id, sec_id, semester, year))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

# ----------------------------
# PDF 생성
# ----------------------------
def create_attendance_pdf(course_title, sec_id, semester, year, instructor, credits, students, filename="attendance.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=20, leftMargin=20,
        topMargin=25, bottomMargin=25
    )

    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        name="TitleStyle",
        fontSize=18,
        alignment=1,
        spaceAfter=10
    )

    info_style = ParagraphStyle(
        name="InfoStyle",
        fontSize=11,
        leading=14,
        spaceAfter=6
    )

    name_style = ParagraphStyle(
        name='NameStyle',
        fontSize=8.5,
        leading=9
    )

    # -------------------------
    # 제목 / 강의 정보
    # -------------------------
    title = Paragraph("<b>Attendance Sheet</b>", title_style)
    elements.append(title)

    info_text = f"""
    <b>Course:</b> {course_title}<br/>
    <b>Section:</b> {sec_id}<br/>
    <b>Semester:</b> {semester}<br/>
    <b>Year:</b> {year}<br/>
    <b>Instructor:</b> {instructor}<br/>
    <b>Credits:</b> {credits}<br/>
    """
    elements.append(Paragraph(info_text, info_style))
    elements.append(Spacer(1, 10))

    # -------------------------
    # 헤더 (1~16주)
    # -------------------------
    header = ["Student ID", "Name", "Department"] + [f"{i}W" for i in range(1, 17)]
    table_data = [header]

    # -------------------------
    # 학생 데이터
    # -------------------------
    for sid, name, dept in students:
        row = [sid, Paragraph(name, name_style), dept] + [""] * 16
        table_data.append(row)

    # -------------------------
    # 열 폭 조정
    # -------------------------
    col_widths = [
        55,     # Student ID
        100,    # Name
        110     # Department
    ] + [20] * 16

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.85, 0.85, 0.85)),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
    ]))

    elements.append(table)
    doc.build(elements)


# ----------------------------
# 라우트
# ----------------------------
@app.route("/", methods=["GET", "POST"])
def index():
    sections = get_sections()

    if request.method == "POST":
        course_id = request.form.get("course_id")
        sec_id = request.form.get("sec_id")
        semester = request.form.get("semester")
        year = request.form.get("year")

        students_json = request.form.get("students_json")

        if students_json and len(students_json) > 5:
            students = json.loads(students_json)
        else:
            students = get_students(course_id, sec_id, semester, year)

        # 해당 강좌 정보 찾기
        selected = next((row for row in sections if str(row[0]) == course_id 
                         and str(row[2]) == sec_id 
                         and str(row[3]) == semester 
                         and str(row[4]) == year), None)

        course_title = selected[1]
        credits = selected[5]
        instructor = selected[6] if selected[6] else "Unknown"

        filename = f"{course_title}_{sec_id}_attendance.pdf"
        create_attendance_pdf(course_title, sec_id, semester, year, instructor, credits, students, filename)
        
        return send_file(filename, as_attachment=True)

    return render_template("index.html", sections=sections)


@app.route("/preview", methods=["POST"])
def preview():
    data = request.get_json()
    students = get_students(data["course_id"], data["sec_id"], data["semester"], data["year"])
    return json.dumps(students)


if __name__ == "__main__":
    app.run(debug=True)
