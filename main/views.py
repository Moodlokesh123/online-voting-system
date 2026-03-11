from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.db.models import Count
from django.db import IntegrityError
from django.contrib.auth.hashers import make_password, check_password

from .models import Voter, Candidate, Vote


# =======================
# PAGE VIEWS
# =======================

from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def login_view(request):
    return render(request, 'login.html')

@ensure_csrf_cookie
def registration(request):
    return render(request, 'registration.html')


def voting(request):
    voter_id = request.session.get("voter_id")
    if not voter_id:
        return redirect("/")

    voter = get_object_or_404(Voter, id=voter_id)

    if voter.has_voted:
        return redirect("/results/")

    candidates = Candidate.objects.all()
    return render(request, "voting.html", {"candidates": candidates})


def results(request):
    results = Candidate.objects.annotate(
        total_votes=Count("votes")
    ).order_by("-total_votes")

    return render(request, "results.html", {"results": results})


def dashboard(request):
    voter_id = request.session.get("voter_id")
    if not voter_id:
        return redirect("/")

    voter = get_object_or_404(Voter, id=voter_id)
    has_voted = Vote.objects.filter(voter=voter).exists()

    return render(request, "dashboard.html", {
        "voter": voter,
        "has_voted": has_voted
    })


# =======================
# API VIEWS
# =======================

def register_user(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request"})

    data = request.POST

    govt_voter_id = data.get("govt_voter_id")
    username = data.get("username")
    password = data.get("password")
    confirm_password = data.get("confirm_password")

    if not all([govt_voter_id, username, password, confirm_password]):
        return JsonResponse({
            "success": False,
            "message": "All fields are required"
        })

    if password != confirm_password:
        return JsonResponse({
            "success": False,
            "message": "Passwords do not match"
        })

    if Voter.objects.filter(govt_voter_id=govt_voter_id).exists():
        return JsonResponse({
            "success": False,
            "message": "Govt Voter ID already registered"
        })

    if Voter.objects.filter(username=username).exists():
        return JsonResponse({
            "success": False,
            "message": "Username already exists"
        })

    Voter.objects.create(
        full_name=data.get("full_name"),
        govt_voter_id=govt_voter_id,
        username=username,
        gender=data.get("gender"),
        constituency=data.get("constituency"),
        dob=data.get("dob"),
        password=make_password(password)
    )

    return JsonResponse({
        "success": True,
        "message": "Registration successful"
    })


def login_user(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request"})

    username = request.POST.get("username")
    password = request.POST.get("password")

    if not username or not password:
        return JsonResponse({
            "success": False,
            "message": "Username and password required"
        })

    try:
        voter = Voter.objects.get(username=username)
    except Voter.DoesNotExist:
        return JsonResponse({
            "success": False,
            "message": "Invalid username or password"
        })

    if not check_password(password, voter.password):
        return JsonResponse({
            "success": False,
            "message": "Invalid username or password"
        })

    # ✅ Session handling (CRITICAL FIX)
    request.session.flush()
    request.session["voter_id"] = voter.id
    request.session["username"] = voter.username
    request.session["is_logged_in"] = True

    return JsonResponse({
        "success": True,
        "redirect_url": "/dashboard/"
    })


def submit_vote(request):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Invalid request"})

    voter_id = request.session.get("voter_id")
    if not voter_id:
        return JsonResponse({
            "status": "error",
            "message": "User not logged in"
        })

    voter = get_object_or_404(Voter, id=voter_id)

    if voter.has_voted:
        return JsonResponse({
            "status": "error",
            "message": "You have already voted"
        })

    candidate_id = request.POST.get("candidate_id")
    candidate = get_object_or_404(Candidate, id=candidate_id)

    try:
        Vote.objects.create(voter=voter, candidate=candidate)
        voter.has_voted = True
        voter.save()

        return JsonResponse({
            "status": "success",
            "message": "Vote submitted successfully"
        })

    except IntegrityError:
        return JsonResponse({
            "status": "error",
            "message": "You have already voted"
        })
