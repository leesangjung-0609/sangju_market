from flask import Flask, request, send_file, render_template
import mysql.connector
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import json
import time 

app = Flask(__name__)

DB_CONFIG = {
    "host": "155.230.241.241",
    "user": "team3_nam",
    "password": "team3_nam##",
    "database": "univ_db_team3"
}

# ----------------------------
# DB 조회 함수 (변경 없음)
# ----------------------------
def get_sections():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    query = """
        SELECT 
            s.course_id,          -- [0]
            c.title,              -- [1]
            s.sec_id,             -- [2]
            s.semester,           -- [3]
            s.year,               -- [4]
            c.credits,            -- [5]
            i.name AS instructor_name, -- [6]
            c.dept_name           -- [7]
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
# PDF 생성 (서식 복구 + 여백 40 + 글자 깨짐 해결)
# ----------------------------
def create_attendance_pdf(course_title, dept_name, sec_id, semester, year, instructor, credits, students, filename="attendance.pdf"):
    # [수정] 좌우 여백을 아까의 절반(40)으로 설정
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=40, leftMargin=40, 
        topMargin=30, bottomMargin=40
    )

    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(name="TitleStyle", fontSize=18, alignment=1, spaceAfter=15)
    # [수정] 정보 텍스트 스타일: 원래대로 좌측 정렬 및 줄간격 확보
    info_style = ParagraphStyle(name="InfoStyle", fontSize=11, leading=14, spaceAfter=10)
    name_style = ParagraphStyle(name='NameStyle', fontSize=8.5, leading=9, alignment=1)

    # 쪽 번호 함수
    def add_page_number(canvas, doc):
        page_num = canvas.getPageNumber()
        text = f"- {page_num} -"
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.drawCentredString(A4[0] / 2, 20, text)
        canvas.restoreState()

    # 제목
    title = Paragraph("<b>Attendance Sheet</b>", title_style)
    elements.append(title)

    # [수정] 상단 정보 서식 원래대로 복구 (List Style)
    info_text = f"""
    <b>Course:</b> {course_title}<br/>
    <b>Section:</b> {sec_id}<br/>
    <b>Instructor:</b> {instructor}<br/>
    <b>Department:</b> {dept_name}<br/>
    <b>Year:</b> {year}<br/>
    <b>Semester:</b> {semester}<br/>
    <b>Credits:</b> {credits}<br/>
    """
    elements.append(Paragraph(info_text, info_style))
    elements.append(Spacer(1, 10))

    # 헤더
    header = ["Student ID", "Name", "Department"] + [f"{i}W" for i in range(1, 17)]
    table_data = [header]

    for sid, name, dept in students:
        row = [sid, Paragraph(name, name_style), dept] + [""] * 16
        table_data.append(row)

    # [수정] 너비 재계산 (글자 안 깨지게 확보)
    # A4 폭(약 595) - 여백(80) = 515 사용 가능
    # 50(ID) + 75(이름) + 70(학과) + (20 * 16주) = 195 + 320 = 515 (딱 맞음)
    col_widths = [50, 75, 70] + [20] * 16

    table = Table(table_data, colWidths=col_widths, repeatRows=1, hAlign='CENTER')

    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.85, 0.85, 0.85)), # 헤더 색상도 원래대로 복구
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 8),      # 폰트 8pt (적당함)
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))

    elements.append(table)
    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)


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

        selected = next((row for row in sections if str(row[0]) == course_id 
                         and str(row[2]) == sec_id 
                         and str(row[3]) == semester 
                         and str(row[4]) == year), None)

        if selected:
            course_title = selected[1]
            credits = selected[5]
            instructor = selected[6] if selected[6] else "Unknown"
            dept_name = selected[7]

            timestamp = int(time.time()) 
            filename = f"{course_title.replace(' ', '')}_{sec_id}_{timestamp}.pdf"
            
            create_attendance_pdf(course_title, dept_name, sec_id, semester, year, instructor, credits, students, filename)
            
            return send_file(filename, as_attachment=True)

    return render_template("index.html", sections=sections)


@app.route("/preview", methods=["POST"])
def preview():
    data = request.get_json()
    students = get_students(data["course_id"], data["sec_id"], data["semester"], data["year"])
    return json.dumps(students)


if __name__ == "__main__":
    app.run(debug=True)
