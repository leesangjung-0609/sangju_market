from flask import Flask, request, send_file, render_template
import pymysql
import time
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import json

app = Flask(__name__)

# DB 설정
DB_CONFIG = {
    "host": "155.230.241.241",
    "user": "team3_nam",
    "password": "team3_nam##",
    "database": "univ_db_team3",
    "connect_timeout": 5,
    "read_timeout": 5,
    "write_timeout": 5,
    "cursorclass": pymysql.cursors.Cursor
}

# 재접속 로직
def get_connection_with_retry(max_retries=3):
    for attempt in range(max_retries):
        try:
            conn = pymysql.connect(**DB_CONFIG)
            conn.ping(reconnect=True)
            return conn
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(0.5)
            else:
                print(f"❌ DB 연결 실패: {e}")
                return None
    return None

def get_sections():
    conn = None
    try:
        conn = get_connection_with_retry()
        if not conn: return []
        
        cursor = conn.cursor()
        query = """
            SELECT 
                s.course_id, c.title, s.sec_id, s.semester, s.year, 
                c.credits, i.name AS instructor_name, c.dept_name
            FROM section s
            JOIN course c ON s.course_id = c.course_id
            LEFT JOIN teaches t ON s.course_id = t.course_id AND s.sec_id = t.sec_id AND s.semester = t.semester AND s.year = t.year
            LEFT JOIN instructor i ON t.ID = i.ID
            ORDER BY c.title, s.year DESC, s.semester DESC, s.sec_id ASC
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        return rows
    except Exception as e:
        print(f"❌ get_sections 오류: {e}")
        return []
    finally:
        if conn:
            try: conn.close()
            except: pass

def get_students(course_id, sec_id, semester, year):
    conn = None
    try:
        conn = get_connection_with_retry()
        if not conn: return []
        
        cursor = conn.cursor()
        # [수정] ID를 숫자로 변환하여 정렬 (CAST(s.id AS UNSIGNED))
        query = """
            SELECT s.id, s.name, s.dept_name
            FROM takes t
            JOIN student s ON t.id = s.id
            WHERE t.course_id = %s AND t.sec_id = %s AND t.semester = %s AND t.year = %s
            ORDER BY CAST(s.id AS UNSIGNED) ASC
        """
        cursor.execute(query, (course_id, sec_id, semester, year))
        rows = cursor.fetchall()
        return rows
    except Exception as e:
        print(f"❌ get_students 오류: {e}")
        return []
    finally:
        if conn:
            try: conn.close()
            except: pass

# PDF 생성 (기존 유지)
def create_attendance_pdf(course_title, dept_name, sec_id, semester, year, instructor, credits, students, filename="attendance.pdf"):
    full_title_text = f"{course_title}-{sec_id} Attendance Sheet"
    doc = SimpleDocTemplate(filename, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=30, bottomMargin=40, title=full_title_text)
    elements = []
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(name="TitleStyle", fontSize=18, alignment=1, spaceAfter=15)
    info_style = ParagraphStyle(name="InfoStyle", fontSize=11, leading=14, spaceAfter=10)
    name_style = ParagraphStyle(name='NameStyle', fontSize=8.5, leading=9, alignment=1)

    def add_page_number(canvas, doc):
        page_num = canvas.getPageNumber()
        text = f"- {page_num} -"
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.drawCentredString(A4[0] / 2, 20, text)
        canvas.restoreState()

    elements.append(Paragraph(f"<b>{full_title_text}</b>", title_style))
    info_text = f"<b>Instructor:</b> {instructor}<br/><b>Department:</b> {dept_name}<br/><b>Term:</b> {year} - {semester}<br/><b>Credits:</b> {credits}<br/>"
    elements.append(Paragraph(info_text, info_style))
    elements.append(Spacer(1, 10))

    header = ["Student ID", "Name", "Department"] + [f"{i}W" for i in range(1, 17)]
    table_data = [header]

    for student in students:
        sid = student[0]
        name = student[1]
        dept = student[2]
        row = [sid, Paragraph(name, name_style), dept] + [""] * 16
        table_data.append(row)

    col_widths = [50, 75, 70] + [20] * 16
    table = Table(table_data, colWidths=col_widths, repeatRows=1, hAlign='CENTER')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.85, 0.85, 0.85)),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)
    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)

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
            filename = f"{course_title}-{sec_id} Attendance Sheet.pdf"
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