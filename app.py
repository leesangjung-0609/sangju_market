from flask import Flask, request, send_file, render_template
import mysql.connector
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle



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
        SELECT s.course_id, c.title, s.sec_id, s.semester, s.year
        FROM section s
        JOIN course c ON s.course_id = c.course_id
        ORDER BY c.title, s.year DESC, s.semester DESC, s.sec_id ASC
    """
    cursor.execute(query)
    rows = cursor.fetchall()  # (course_id, title, sec_id, semester, year)
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
def create_attendance_pdf(course_title, sec_id, semester, year, students, filename="attendance.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=25, leftMargin=25,
        topMargin=30, bottomMargin=30
    )

    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        name="TitleStyle",
        fontSize=18,
        alignment=1,  # Center
        spaceAfter=15
    )

    info_style = ParagraphStyle(
        name="InfoStyle",
        fontSize=11,
        leading=14,
        spaceAfter=6
    )

    name_style = ParagraphStyle(
        name='NameStyle',
        fontSize=9,
        leading=10
    )

    # -------------------------
    # 상단 제목
    # -------------------------
    title = Paragraph(f"<b>Attendance Sheet</b>", title_style)
    elements.append(title)

    # -------------------------
    # 강의 정보 박스
    # -------------------------
    info_text = f"""
    <b>Course:</b> {course_title}<br/>
    <b>Section:</b> {sec_id}<br/>
    <b>Semester:</b> {semester}<br/>
    <b>Year:</b> {year}<br/>
    """
    elements.append(Paragraph(info_text, info_style))
    elements.append(Spacer(1, 15))

    # -------------------------
    # 테이블 생성
    # -------------------------
    header1 = ["Student ID", "Name", "Department"] + [f"{i}W" for i in range(1, 9)]
    header2 = ["", "", ""] + [f"{i}W" for i in range(9, 17)]

    table_data = [header1, header2]

    for sid, name, dept in students:
        row1 = [sid, Paragraph(name, name_style), dept] + [""]*8
        row2 = ["", "", ""] + [""]*8
        table_data.extend([row1, row2])

    col_widths = [55, 150, 120] + [28]*8

    table = Table(table_data, colWidths=col_widths, repeatRows=2)

    # -------------------------
    # 테이블 디자인 스타일
    # -------------------------
    table_style = TableStyle([
        # 헤더 배경
        ('BACKGROUND', (0, 0), (-1, 1), colors.Color(0.85, 0.85, 0.85)),
        ('TEXTCOLOR', (0, 0), (-1, 1), colors.black),

        # 정렬
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

        # 폰트
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),

        # 패딩
        ('FONTSIZE', (0, 0), (-1, 1), 9),
        ('FONTSIZE', (0, 2), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),

        # 테두리
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),

        # 줄무늬 배경 (2행부터 적용)
        ('ROWBACKGROUNDS', (0, 2), (-1, -1), [colors.whitesmoke, colors.Color(0.96, 0.96, 0.96)]),
    ])

    table.setStyle(table_style)
    elements.append(table)

    # PDF 만들기
    doc.build(elements)


# ----------------------------
# Flask 라우트
# ----------------------------
@app.route("/", methods=["GET", "POST"])
def index():
    sections = get_sections()  # 모든 섹션 조회
    if request.method == "POST":
        course_id = request.form.get("course_id")
        sec_id = request.form.get("sec_id")
        semester = request.form.get("semester")
        year = request.form.get("year")

        if course_id and sec_id and semester and year:
            # 선택한 섹션 학생 조회
            students = get_students(course_id, sec_id, semester, year)
            if not students:
                return "No students found for this selection."

            # course_id → course_title로 표시용
            course_title = next((row[1] for row in sections if str(row[0])==course_id), "Unknown")
            filename = f"{course_title}_{sec_id}_attendance.pdf"
            create_attendance_pdf(course_title, sec_id, semester, year, students, filename)
            return send_file(filename, as_attachment=True)

    return render_template("index.html", sections=sections)

if __name__ == "__main__":
    app.run(debug=True)


